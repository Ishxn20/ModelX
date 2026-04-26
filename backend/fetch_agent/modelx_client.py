from __future__ import annotations

import asyncio
import re
from dataclasses import dataclass
from typing import Any, Dict, Optional

import httpx


DEFAULT_BACKEND_URL = "http://127.0.0.1:8000"
DEFAULT_POLL_INTERVAL_SECONDS = 2.0
DEFAULT_TIMEOUT_SECONDS = 240.0


class ModelXAgentError(RuntimeError):
    """Raised when the ModelX Agentverse adapter cannot complete a plan."""


@dataclass(frozen=True)
class ModelXClientConfig:
    backend_url: str = DEFAULT_BACKEND_URL
    poll_interval_seconds: float = DEFAULT_POLL_INTERVAL_SECONDS
    timeout_seconds: float = DEFAULT_TIMEOUT_SECONDS


def build_plan_request(user_text: str) -> Dict[str, Any]:
    text = " ".join(user_text.split())
    if not text:
        raise ModelXAgentError("Please describe the ML idea you want ModelX to plan.")

    return {
        "project_title": _derive_project_title(text),
        "idea": text,
        "goal": f"Create a beginner-friendly machine learning blueprint for: {text[:500]}",
        "skill_level": _infer_skill_level(text),
        "data_status": _infer_data_status(text),
        "data_description": _infer_data_description(text),
        "constraints": "Generated from an ASI:One chat request through the ModelX Agentverse adapter.",
    }


def format_blueprint_response(plan_status: Dict[str, Any]) -> str:
    result = plan_status.get("result") or {}
    project = plan_status.get("project_data") or {}
    title = project.get("project_title") or "ModelX Blueprint"

    if not result:
        error = plan_status.get("error") or "ModelX did not return a blueprint."
        raise ModelXAgentError(str(error))

    compatibility = result.get("compatibility_result") or {}
    datasets = result.get("kaggle_datasets") or []
    models = result.get("huggingface_models") or []
    next_steps = result.get("next_steps") or []

    sections = [
        f"# {title}",
        f"**Recommendation:** {result.get('recommendation', 'START_SIMPLE')}",
        _section("Summary", result.get("summary")),
        _section("Problem Framing", result.get("problem_framing")),
        _section("Dataset Plan", result.get("dataset_plan")),
        _section("Model Plan", result.get("model_plan")),
        _section("Training Plan", result.get("training_plan")),
        _section("Evaluation Plan", result.get("evaluation_plan")),
    ]

    if compatibility:
        pair_lines = [
            f"Dataset: {compatibility.get('chosen_dataset', 'Not selected')}",
            f"Model: {compatibility.get('chosen_model', 'Not selected')}",
            f"Compatibility: {compatibility.get('compatibility_score', 'Not scored')}",
        ]
        why = compatibility.get("why_this_pair")
        if why:
            pair_lines.append(f"Why this pair: {why}")
        sections.append(_section("Recommended Dataset + Model Pair", "\n".join(pair_lines)))

    if datasets:
        dataset_lines = [
            f"{item.get('rank', index + 1)}. {item.get('title', 'Untitled dataset')} - {item.get('url', '')}"
            for index, item in enumerate(datasets[:3])
        ]
        sections.append(_section("Top Kaggle Leads", "\n".join(dataset_lines)))

    if models:
        model_lines = [
            f"{item.get('rank', index + 1)}. {item.get('model_id', 'unknown/model')} - {item.get('url', '')}"
            for index, item in enumerate(models[:3])
        ]
        sections.append(_section("Top HuggingFace Leads", "\n".join(model_lines)))

    if next_steps:
        step_lines = "\n".join(f"{index + 1}. {step}" for index, step in enumerate(next_steps[:6]))
        sections.append(_section("Next Steps", step_lines))

    return "\n\n".join(section for section in sections if section).strip()


class ModelXBackendClient:
    def __init__(self, config: Optional[ModelXClientConfig] = None):
        self.config = config or ModelXClientConfig()
        self.base_url = self.config.backend_url.rstrip("/")

    async def create_blueprint(self, user_text: str) -> Dict[str, Any]:
        payload = build_plan_request(user_text)
        async with httpx.AsyncClient(timeout=30.0) as client:
            start_resp = await client.post(f"{self.base_url}/api/plan", json=payload)
            start_resp.raise_for_status()
            session_id = start_resp.json().get("session_id")
            if not session_id:
                raise ModelXAgentError("ModelX backend did not return a planning session id.")

            deadline = asyncio.get_running_loop().time() + self.config.timeout_seconds
            last_status: Dict[str, Any] = {}

            while asyncio.get_running_loop().time() < deadline:
                status_resp = await client.get(f"{self.base_url}/api/plan/{session_id}")
                status_resp.raise_for_status()
                last_status = status_resp.json()
                status = last_status.get("status")

                if status == "completed":
                    return last_status
                if status == "failed":
                    raise ModelXAgentError(last_status.get("error") or "ModelX planning failed.")

                await asyncio.sleep(self.config.poll_interval_seconds)

            raise ModelXAgentError(
                f"ModelX planning timed out after {int(self.config.timeout_seconds)} seconds. "
                f"Last status: {last_status.get('status', 'unknown')}"
            )


def _derive_project_title(text: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9 ]+", "", text).strip()
    words = cleaned.split()[:8]
    if not words:
        return "ASI One ModelX Blueprint"
    return " ".join(words)


def _infer_skill_level(text: str) -> str:
    lowered = text.lower()
    if any(term in lowered for term in ("intermediate", "experienced", "advanced", "production")):
        return "intermediate"
    if any(term in lowered for term in ("python", "notebook", "pandas", "sklearn", "some coding")):
        return "some_python"
    return "beginner"


def _infer_data_status(text: str) -> str:
    lowered = text.lower()
    if any(term in lowered for term in ("i have data", "i have a dataset", "my dataset", "csv", "spreadsheet")):
        return "have_dataset"
    if any(term in lowered for term in ("public dataset", "kaggle", "huggingface dataset", "find data")):
        return "need_public_dataset"
    return "no_dataset"


def _infer_data_description(text: str) -> str:
    lowered = text.lower()
    if _infer_data_status(text) == "have_dataset":
        return f"User says they already have data. Original request: {text[:400]}"
    if "kaggle" in lowered or "public dataset" in lowered or "find data" in lowered:
        return "User wants ModelX to recommend public datasets."
    return "No dataset supplied yet; ModelX should recommend a practical starting dataset."


def _section(title: str, body: Any) -> str:
    if not body:
        return ""
    return f"## {title}\n{body}"

