from __future__ import annotations

import json
import os
from typing import List, Optional

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

router = APIRouter()

GEMMA_MODEL = os.environ.get("GEMMA_MODEL") or os.environ.get("GOOGLE_GEMMA_MODEL") or "gemma-4-26b-a4b-it"
GEMMA_MAX_TOKENS = 2048
GEMMA_TEMPERATURE = 0.7

_SYSTEM_PROMPT = """You are Gemma, an AI assistant built into ModelX — a platform that helps beginners plan their first machine learning project.

About ModelX:
- Users fill in their ML idea, goal, skill level, and data situation
- 8 AI specialist agents collaborate to produce an ML Blueprint
- The Blueprint covers: problem framing, dataset recommendations (from Kaggle), model recommendations (from HuggingFace), a compatibility analysis, training steps, evaluation metrics, glossary, and next steps
- After getting a blueprint users can: run a Training Simulation (compares a custom model vs a pre-trained HuggingFace model), use Inference Chat (simulate talking to their trained model), and Deploy (download a model config, starter Jupyter notebook, or full repository ZIP)

The 8 planning agents:
- **Dataset Agent** — figures out what data is needed and what labels look like
- **Kaggle Agent** — finds the top 5 relevant public datasets on Kaggle
- **Model Agent** — recommends a baseline and a stretch model
- **HuggingFace Agent** — finds the top 5 pre-trained models on HuggingFace
- **Compatibility Agent** — picks the best dataset+model pair and builds a preprocessing roadmap across 5 dimensions
- **Training Agent** — designs the training recipe (preprocessing, splits, overfitting checks)
- **Evaluation Agent** — defines metrics, test cases, and failure modes
- **ModelX Guide** — synthesises everything into the final blueprint with a START_SIMPLE / NEEDS_DATA / REFINE_IDEA recommendation

Your role:
- Answer ML questions in plain, beginner-friendly language — avoid unexplained jargon
- Help users understand their blueprint and what each section means
- Guide users through the ModelX interface and workflow
- Suggest next steps based on where the user is in the process
- Keep responses concise — 2-4 sentences for simple questions, structured lists for complex ones
- Use **bold**, bullet lists, and markdown when it genuinely helps readability
"""


class GemmaChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class BlueprintContext(BaseModel):
    project_title: Optional[str] = None
    recommendation: Optional[str] = None
    summary: Optional[str] = None
    problem_framing: Optional[str] = None
    dataset_plan: Optional[str] = None
    model_plan: Optional[str] = None
    training_plan: Optional[str] = None
    evaluation_plan: Optional[str] = None
    debate_summary: Optional[str] = None
    next_steps: Optional[List[str]] = None
    glossary: Optional[List[dict]] = None
    compatibility_result: Optional[dict] = None
    kaggle_datasets: Optional[List[dict]] = None
    huggingface_models: Optional[List[dict]] = None


class ProjectContext(BaseModel):
    project_title: Optional[str] = None
    idea: Optional[str] = None
    goal: Optional[str] = None
    skill_level: Optional[str] = None
    data_status: Optional[str] = None
    data_description: Optional[str] = None
    constraints: Optional[str] = None


class GemmaChatRequest(BaseModel):
    messages: List[GemmaChatMessage]
    blueprint: Optional[BlueprintContext] = None
    project: Optional[ProjectContext] = None
    current_view: Optional[str] = None  # "input" or "plan"
    page_context: Optional[str] = None


def _build_system_prompt(req: GemmaChatRequest) -> str:
    prompt = _SYSTEM_PROMPT

    if req.current_view == "input":
        prompt += "\n\nThe user is currently on the idea input form — they have not generated a blueprint yet."
    elif req.current_view == "plan":
        prompt += "\n\nThe user is currently in the generated plan/blueprint workspace."

    lines = ["\n\n=== CURRENT APP CONTEXT ==="]
    if req.page_context:
        lines.append(f"Current page context: {req.page_context[:600]}")
    if req.project:
        p = req.project
        if p.project_title:
            lines.append(f"Project title: {p.project_title}")
        if p.idea:
            lines.append(f"Original idea: {p.idea[:500]}")
        if p.goal:
            lines.append(f"Goal: {p.goal[:400]}")
        if p.skill_level:
            lines.append(f"Skill level: {p.skill_level}")
        if p.data_status:
            lines.append(f"Data status: {p.data_status}")
        if p.data_description:
            lines.append(f"Data description: {p.data_description[:400]}")
        if p.constraints:
            lines.append(f"Constraints: {p.constraints[:400]}")
    if req.blueprint:
        b = req.blueprint
        if b.project_title:
            lines.append(f"Blueprint project title: {b.project_title}")
        if b.recommendation:
            lines.append(f"Blueprint recommendation: {b.recommendation}")
        if b.summary:
            lines.append(f"Blueprint summary: {b.summary[:900]}")
        if b.problem_framing:
            lines.append(f"Problem framing: {b.problem_framing[:700]}")
        if b.dataset_plan:
            lines.append(f"Dataset plan: {b.dataset_plan[:700]}")
        if b.model_plan:
            lines.append(f"Model plan: {b.model_plan[:700]}")
        if b.training_plan:
            lines.append(f"Training plan: {b.training_plan[:700]}")
        if b.evaluation_plan:
            lines.append(f"Evaluation plan: {b.evaluation_plan[:700]}")
        if b.debate_summary:
            lines.append(f"Agent debate summary: {b.debate_summary[:700]}")
        if b.compatibility_result:
            lines.append(f"Compatibility result: {json.dumps(b.compatibility_result)[:900]}")
        if b.kaggle_datasets:
            lines.append(f"Kaggle datasets: {json.dumps(b.kaggle_datasets[:3])[:900]}")
        if b.huggingface_models:
            lines.append(f"HuggingFace models: {json.dumps(b.huggingface_models[:3])[:900]}")
        if b.next_steps:
            steps = "\n".join(f"- {s}" for s in b.next_steps[:6])
            lines.append(f"Suggested next steps:\n{steps}")
    lines.append("=== END APP CONTEXT ===")
    prompt += "\n".join(lines)

    return prompt


def _sse_error(msg: str, *, as_error: bool = True):
    async def _stream():
        key = "error" if as_error else "token"
        yield f"data: {json.dumps({key: msg})}\n\n"
        yield "data: [DONE]\n\n"
    return StreamingResponse(
        _stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/api/gemma/chat")
async def gemma_chat(req: GemmaChatRequest):
    api_key = os.environ.get("GOOGLE_API_KEY", "")
    if not api_key:
        return _sse_error(
            "⚠️ GOOGLE_API_KEY is not set. Add it to your backend .env file to enable Gemma chat."
        )

    if not req.messages:
        return _sse_error("No message provided.")

    try:
        from google import genai
        from google.genai import types
    except ImportError:
        return _sse_error(
            "⚠️ google-genai is not installed. Run: pip install google-genai"
        )

    client = genai.Client(api_key=api_key)
    system_prompt = _build_system_prompt(req)

    # Build contents list — all messages in order
    contents = []
    for msg in req.messages:
        role = "model" if msg.role == "assistant" else "user"
        contents.append(
            types.Content(role=role, parts=[types.Part(text=msg.content)])
        )

    genai_config = types.GenerateContentConfig(
        system_instruction=system_prompt,
        temperature=GEMMA_TEMPERATURE,
        max_output_tokens=GEMMA_MAX_TOKENS,
    )

    async def event_stream():
        try:
            stream = await client.aio.models.generate_content_stream(
                model=GEMMA_MODEL,
                contents=contents,
                config=genai_config,
            )
            async for chunk in stream:
                text = None
                # Primary path
                try:
                    text = chunk.text
                except Exception:
                    pass
                # Fallback: walk candidates → content → parts (skip thought parts)
                if not text:
                    try:
                        for part in chunk.candidates[0].content.parts:
                            if getattr(part, "thought", False):
                                continue
                            if getattr(part, "text", None):
                                text = part.text
                                break
                    except Exception:
                        pass
                if text:
                    yield f"data: {json.dumps({'token': text})}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as exc:
            yield f"data: {json.dumps({'error': str(exc)})}\n\n"
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
