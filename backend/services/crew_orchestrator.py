import asyncio
import json
import logging
import re
import uuid
from datetime import datetime
from typing import Any, Dict, Optional

from crewai import Crew, Process

from agents.definitions import create_all_agents
from api.sse import sse_manager
from config import settings
from tasks.decision_tasks import create_modelx_guide_task
from tasks.research_tasks import (
    create_compatibility_task,
    create_dataset_task,
    create_evaluation_task,
    create_huggingface_task,
    create_kaggle_task,
    create_model_task,
    create_training_task,
)

logger = logging.getLogger(__name__)

PLAN_INIT_SLEEP = 1.0


class ModelXPlannerOrchestrator:
    TASK_PHASES = ["dataset", "kaggle", "model", "huggingface", "compatibility", "training", "evaluation", "blueprint"]

    def __init__(self):
        self.sessions: Dict[str, Dict[str, Any]] = {}
        self.task_to_agent_map: Dict[str, list[str]] = {}
        self.current_task_index: Dict[str, int] = {}

    async def start_plan(self, project_data: dict) -> str:
        session_id = str(uuid.uuid4())
        self.sessions[session_id] = {
            "status": "running",
            "project_data": project_data,
            "result": None,
        }

        asyncio.create_task(self._run_plan(session_id, project_data))

        logger.info(
            "Started ModelX plan for %s (session: %s)",
            project_data.get("project_title") or project_data.get("idea", "Untitled project"),
            session_id,
        )
        return session_id

    async def _run_plan(self, session_id: str, project_data: dict):
        loop = asyncio.get_running_loop()

        try:
            project_label = project_data.get("project_title") or "your ML idea"
            logger.info("Starting ModelX planning workflow for %s", project_label)

            await asyncio.sleep(PLAN_INIT_SLEEP)
            await sse_manager.send_phase_change(session_id, "idea")
            await sse_manager.send_agent_message(
                session_id,
                "system",
                f"ModelX is reading the idea and preparing the specialist agents for {project_label}.",
                "info",
            )

            agents = create_all_agents()
            logger.info("ModelX agents created: %s", list(agents.keys()))

            task_dataset = create_dataset_task(agents, project_data, context=[])
            task_kaggle = create_kaggle_task(agents, project_data, context=[task_dataset])
            task_model = create_model_task(agents, project_data, context=[task_dataset])
            task_huggingface = create_huggingface_task(agents, project_data, context=[task_model])
            task_compatibility = create_compatibility_task(
                agents,
                project_data,
                context=[task_dataset, task_kaggle, task_model, task_huggingface],
            )
            task_training = create_training_task(
                agents, project_data, context=[task_dataset, task_model, task_compatibility]
            )
            task_evaluation = create_evaluation_task(
                agents, project_data, context=[task_dataset, task_model, task_training]
            )
            task_guide = create_modelx_guide_task(
                agents,
                project_data,
                context=[task_dataset, task_model, task_training, task_evaluation],
            )

            all_tasks = [
                task_dataset,
                task_kaggle,
                task_model,
                task_huggingface,
                task_compatibility,
                task_training,
                task_evaluation,
                task_guide,
            ]
            task_labels = [
                "Task 1: Dataset Agent",
                "Task 2: Kaggle Agent",
                "Task 3: Model Agent",
                "Task 4: HuggingFace Agent",
                "Task 5: Compatibility Agent",
                "Task 6: Training Agent",
                "Task 7: Evaluation Agent",
                "Task 8: ModelX Guide",
            ]

            task_agent_map = []
            for index, task in enumerate(all_tasks):
                agent_role = task.agent.role if hasattr(task, "agent") else "unknown"
                task_agent_map.append(agent_role)
                logger.info("Task %s mapped to agent: %s", index + 1, agent_role)

            self.task_to_agent_map[session_id] = task_agent_map
            self.current_task_index[session_id] = 0

            def step_callback_sync(step_output):
                asyncio.run_coroutine_threadsafe(
                    self._step_callback(session_id, step_output),
                    loop,
                )

            crew = Crew(
                agents=list(agents.values()),
                tasks=all_tasks,
                process=Process.sequential,
                verbose=True,
                step_callback=step_callback_sync,
            )

            await sse_manager.send_phase_change(session_id, "dataset")
            await sse_manager.send_agent_message(
                session_id,
                "system",
                "Starting the ModelX guided planning workflow.",
                "info",
            )

            result = await asyncio.to_thread(crew.kickoff, inputs=project_data)

            task_outputs = []
            for index, task in enumerate(all_tasks):
                try:
                    output = str(task.output) if getattr(task, "output", None) else "No output"
                    task_outputs.append(
                        {
                            "task_number": index + 1,
                            "task_label": task_labels[index],
                            "agent": task.agent.role if hasattr(task, "agent") else "Unknown",
                            "output": output[: settings.max_task_output_chars],
                        }
                    )
                except Exception as exc:
                    logger.error("Error capturing task %s output: %s", index + 1, exc)
                    task_outputs.append(
                        {
                            "task_number": index + 1,
                            "task_label": task_labels[index],
                            "error": str(exc),
                        }
                    )

            blueprint = self._extract_blueprint(result)

            blueprint["kaggle_datasets"] = self._parse_kaggle_output(task_kaggle)
            blueprint["huggingface_models"] = self._parse_huggingface_output(task_huggingface)
            blueprint["compatibility_result"] = self._parse_compatibility_output(task_compatibility)
            logger.info(
                "Extracted %d Kaggle datasets, %d HuggingFace models, compatibility_result=%s",
                len(blueprint["kaggle_datasets"]),
                len(blueprint["huggingface_models"]),
                bool(blueprint["compatibility_result"]),
            )

            self.sessions[session_id]["status"] = "completed"
            self.sessions[session_id]["result"] = blueprint
            self.sessions[session_id]["task_outputs"] = task_outputs
            self.sessions[session_id]["completed_at"] = datetime.now().isoformat()

            await sse_manager.send_blueprint(session_id, blueprint)
            await sse_manager.send_phase_change(session_id, "completed")
            logger.info(
                "ModelX plan completed: %s",
                blueprint.get("recommendation", "UNKNOWN"),
            )

        except Exception as exc:
            logger.error("ModelX planning failed: %s", exc, exc_info=True)
            self.sessions[session_id]["status"] = "failed"
            self.sessions[session_id]["error"] = str(exc)
            self.sessions[session_id]["failed_at"] = datetime.now().isoformat()

            try:
                await sse_manager.send_error(
                    session_id,
                    f"ModelX planning failed: {str(exc)}",
                    "PLAN_ERROR",
                )
                await sse_manager.send_phase_change(session_id, "failed")
            except Exception as sse_error:
                logger.error("Failed to broadcast plan error via SSE: %s", sse_error)

        finally:
            self.task_to_agent_map.pop(session_id, None)
            self.current_task_index.pop(session_id, None)

    def _extract_blueprint(self, result: Any) -> dict:
        if hasattr(result, "pydantic") and result.pydantic:
            pydantic_result = result.pydantic
            if hasattr(pydantic_result, "model_dump"):
                return pydantic_result.model_dump()
            if isinstance(pydantic_result, dict):
                return pydantic_result

        if hasattr(result, "json_dict") and result.json_dict:
            return dict(result.json_dict)

        if isinstance(result, dict):
            return result

        raw_output = None
        for attr in ("raw", "output", "final_answer"):
            if hasattr(result, attr):
                raw_output = getattr(result, attr)
                if raw_output:
                    break

        if raw_output is None:
            raw_output = str(result)

        if isinstance(raw_output, dict):
            return raw_output

        raw_text = str(raw_output)
        json_start = raw_text.find("{")
        json_end = raw_text.rfind("}") + 1
        if json_start != -1 and json_end > json_start:
            json_text = raw_text[json_start:json_end]
            try:
                return json.loads(json_text)
            except json.JSONDecodeError as exc:
                logger.warning("Failed to parse MLBlueprint JSON: %s", exc)

        recommendation_match = re.search(
            r'"recommendation"\s*:\s*"([^"]+)"',
            raw_text,
            re.IGNORECASE,
        )
        recommendation = recommendation_match.group(1) if recommendation_match else "REFINE_IDEA"
        return {
            "recommendation": recommendation,
            "summary": raw_text[:2000],
            "problem_framing": "Could not parse structured problem framing from the model output.",
            "dataset_plan": "Could not parse structured dataset plan from the model output.",
            "model_plan": "Could not parse structured model plan from the model output.",
            "training_plan": "Could not parse structured training plan from the model output.",
            "evaluation_plan": "Could not parse structured evaluation plan from the model output.",
            "debate_summary": "Could not parse structured agent debate summary from the model output.",
            "next_steps": ["Review the raw summary and refine the project idea."],
            "glossary": [],
        }

    def _get_task_raw(self, task: Any) -> str:
        if not getattr(task, "output", None):
            return ""
        output = task.output
        for attr in ("json_dict", "pydantic"):
            val = getattr(output, attr, None)
            if isinstance(val, dict):
                return json.dumps(val)
        raw = getattr(output, "raw", None)
        if raw:
            return str(raw)
        return str(output)

    def _extract_all_json_objects(self, text: str) -> list[dict]:
        objects = []
        i = 0
        while i < len(text):
            if text[i] != "{":
                i += 1
                continue
            end = len(text)
            while end > i:
                end = text.rfind("}", i, end)
                if end == -1:
                    break
                try:
                    obj = json.loads(text[i : end + 1])
                    if isinstance(obj, dict):
                        objects.append(obj)
                    break
                except json.JSONDecodeError:
                    end -= 1
            i += 1
        objects.sort(key=lambda o: len(json.dumps(o)), reverse=True)
        return objects

    def _parse_kaggle_output(self, task: Any) -> list:
        raw = self._get_task_raw(task)
        logger.info("[KAGGLE RAW OUTPUT]: %s", raw[:1000])

        if not raw:
            logger.warning("Kaggle task has no output")
            return []

        DATASET_KEYS = ("datasets", "recommended_datasets", "results", "data")
        for obj in self._extract_all_json_objects(raw):
            for key in DATASET_KEYS:
                items = obj.get(key)
                if isinstance(items, list) and items:
                    result = self._build_kaggle_list(items)
                    if result:
                        return result
            if all(isinstance(v, list) for v in obj.values()):
                for v in obj.values():
                    result = self._build_kaggle_list(v)
                    if result:
                        return result

        logger.warning("Could not find datasets list in Kaggle output")
        return []

    def _build_kaggle_list(self, items: list) -> list:
        result = []
        for item in items:
            if not isinstance(item, dict):
                continue
            if "query" in item and "title" not in item:
                continue
            title = str(item.get("title") or item.get("name") or "")
            url = str(item.get("url") or item.get("ref") or "")
            if not title and not url:
                continue
            result.append(
                {
                    "rank": int(item.get("rank", len(result) + 1)),
                    "title": title,
                    "url": url,
                    "description": str(item.get("description") or item.get("subtitle") or ""),
                    "relevance_reason": str(item.get("relevance_reason") or item.get("reason") or ""),
                    "vote_count": int(item.get("vote_count") or item.get("voteCount") or 0),
                    "download_count": int(item.get("download_count") or item.get("downloadCount") or 0),
                }
            )
        result.sort(key=lambda x: x["rank"])
        return result[:5]

    def _parse_huggingface_output(self, task: Any) -> list:
        raw = self._get_task_raw(task)
        logger.info("[HF RAW OUTPUT]: %s", raw[:1000])

        if not raw:
            logger.warning("HuggingFace task has no output")
            return []

        MODEL_KEYS = ("models", "recommended_models", "huggingface_models", "results", "data")
        for obj in self._extract_all_json_objects(raw):
            for key in MODEL_KEYS:
                items = obj.get(key)
                if isinstance(items, list) and items:
                    result = self._build_hf_list(items)
                    if result:
                        return result
            if all(isinstance(v, list) for v in obj.values()):
                for v in obj.values():
                    result = self._build_hf_list(v)
                    if result:
                        return result

        logger.warning("Could not find models list in HuggingFace output")
        return []

    def _build_hf_list(self, items: list) -> list:
        result = []
        for item in items:
            if not isinstance(item, dict):
                continue
            if "query" in item and "model_id" not in item:
                continue
            model_id = str(item.get("model_id") or item.get("id") or item.get("name") or "")
            url = str(item.get("url") or (f"https://huggingface.co/{model_id}" if model_id else ""))
            if not model_id:
                continue
            result.append(
                {
                    "rank": int(item.get("rank", len(result) + 1)),
                    "model_id": model_id,
                    "url": url,
                    "task_type": str(item.get("task_type") or item.get("pipeline_tag") or ""),
                    "relevance_reason": str(item.get("relevance_reason") or item.get("reason") or ""),
                    "downloads": int(item.get("downloads") or 0),
                    "likes": int(item.get("likes") or 0),
                }
            )
        result.sort(key=lambda x: x["rank"])
        return result[:5]

    def _parse_compatibility_output(self, task: Any) -> Optional[dict]:
        raw = self._get_task_raw(task)
        logger.info("[COMPATIBILITY RAW OUTPUT]: %s", raw[:1000])

        if not raw:
            logger.warning("Compatibility task has no output")
            return None

        REQUIRED_KEYS = {"chosen_dataset", "chosen_model", "preprocessing_dimensions"}
        for obj in self._extract_all_json_objects(raw):
            if REQUIRED_KEYS.issubset(obj.keys()):
                dims = obj.get("preprocessing_dimensions", [])
                if isinstance(dims, list) and len(dims) > 0:
                    cleaned_dims = []
                    for d in dims:
                        if not isinstance(d, dict):
                            continue
                        cleaned_dims.append({
                            "dimension": str(d.get("dimension", "")),
                            "status": str(d.get("status", "Minor Prep")),
                            "description": str(d.get("description", "")),
                            "steps": [str(s) for s in d.get("steps", [])],
                        })
                    obj["preprocessing_dimensions"] = cleaned_dims
                    return obj

        logger.warning("Could not parse CompatibilityResult from output")
        return None

    async def _step_callback(self, session_id: str, step_output):
        try:
            task_index = self.current_task_index.get(session_id, 0)
            task_map = self.task_to_agent_map.get(session_id, [])
            agent_name = task_map[task_index] if task_index < len(task_map) else "system"
            output_type = type(step_output).__name__

            logger.info(
                "[STEP CALLBACK] Type: %s, Task: %s/%s, Agent: %s",
                output_type,
                task_index + 1,
                len(self.TASK_PHASES),
                agent_name,
            )

            message = None
            message_type = "step"

            if output_type == "AgentFinish" and hasattr(step_output, "output"):
                output_text = str(step_output.output)
                if len(output_text) > 60:
                    message = output_text[: settings.max_conclusion_chars]
                    message_type = "conclusion"
            elif hasattr(step_output, "thought") and step_output.thought:
                thought_text = str(step_output.thought)
                if len(thought_text) > 20 and not thought_text.startswith("I tried reusing"):
                    message = thought_text[: settings.max_thought_chars]
                    message_type = "thought"

            if message and message.strip():
                await sse_manager.send_agent_message(
                    session_id,
                    agent_name,
                    message,
                    message_type,
                )

                if output_type == "AgentFinish" and message_type == "conclusion":
                    current_index = self.current_task_index.get(session_id, 0)
                    if current_index < len(self.TASK_PHASES) - 1:
                        next_index = current_index + 1
                        self.current_task_index[session_id] = next_index
                        await sse_manager.send_phase_change(
                            session_id,
                            self.TASK_PHASES[next_index],
                        )

        except Exception as exc:
            logger.error("Step callback error: %s", exc, exc_info=True)

    async def get_result(self, session_id: str) -> Optional[dict]:
        session = self.sessions.get(session_id)
        if not session:
            logger.warning("Session not found: %s", session_id)
            return None

        return {
            "session_id": session_id,
            "status": session["status"],
            "project_data": session["project_data"],
            "result": session.get("result"),
            "task_outputs": session.get("task_outputs", []),
            "error": session.get("error"),
            "message": session.get("message"),
            "completed_at": session.get("completed_at"),
            "failed_at": session.get("failed_at"),
        }

    def get_session_count(self) -> int:
        return len(self.sessions)

    def clear_session(self, session_id: str) -> bool:
        if session_id in self.sessions:
            del self.sessions[session_id]
            logger.info("Cleared session: %s", session_id)
            return True
        return False


orchestrator = ModelXPlannerOrchestrator()
