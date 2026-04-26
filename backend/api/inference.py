from __future__ import annotations

import json
import os
import re
from typing import Any, Dict, List, Optional

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

router = APIRouter()

INFERENCE_MODEL = "gpt-4o"
INFERENCE_MAX_TOKENS = 900
INFERENCE_TEMPERATURE = 0.35
_DEFAULT_STRIP_CHARS = 600


class ChatImage(BaseModel):
    data: str
    mime_type: str


class ChatMessage(BaseModel):
    role: str
    content: str
    images: Optional[List[ChatImage]] = None


class CompatibilityInfo(BaseModel):
    chosen_dataset: Optional[str] = ""
    chosen_dataset_url: Optional[str] = ""
    chosen_model: Optional[str] = ""
    chosen_model_url: Optional[str] = ""
    why_this_pair: Optional[str] = ""
    estimated_effort: Optional[str] = ""


class InferenceRequest(BaseModel):
    task_type: str
    model_name: str
    dataset_name: Optional[str] = ""
    problem_framing: Optional[str] = ""
    dataset_plan: Optional[str] = ""
    model_plan: Optional[str] = ""
    training_plan: Optional[str] = ""
    evaluation_plan: Optional[str] = ""
    next_steps: Optional[List[str]] = None
    compatibility: Optional[CompatibilityInfo] = None
    messages: List[ChatMessage]


def _strip_md(text: str, max_chars: int = _DEFAULT_STRIP_CHARS) -> str:
    if not text:
        return ""
    t = re.sub(r"#{1,6}\s+", "", text)
    t = re.sub(r"\*{1,3}([^*]+)\*{1,3}", r"\1", t)
    t = re.sub(r"`{1,3}[^`]*`{1,3}", "", t)
    t = re.sub(r"\[([^\]]+)\]\([^\)]+\)", r"\1", t)
    t = re.sub(r"[-•*]\s+", "- ", t)
    t = re.sub(r"\n{3,}", "\n\n", t).strip()
    if len(t) > max_chars:
        t = t[:max_chars].rsplit(" ", 1)[0] + "…"
    return t


_TASK_HINTS: Dict[str, str] = {
    "binary_classification": (
        "Give a clear positive/negative label with a probability (0–1) and briefly "
        "explain the key signals that drove the decision."
    ),
    "multi_class": (
        "Predict the most likely class and list the top-3 with confidence scores. "
        "Note the distinguishing features briefly."
    ),
    "regression": (
        "Output a numeric prediction with an uncertainty range (±) and name the "
        "top features driving the value."
    ),
    "text_classification": (
        "Classify the text with a label and confidence score; highlight the key "
        "words or phrases that influenced the result."
    ),
    "image_classification": (
        "When an image is provided, describe what you see and return the top-3 "
        "predicted classes with confidence scores. If no image is given, ask for one."
    ),
    "time_series": (
        "Forecast future values from the historical data provided, include confidence "
        "intervals, and flag any trends or anomalies."
    ),
}

_DEFAULT_TASK_HINT = (
    "Analyse the input and produce a relevant prediction with a confidence score "
    "and a brief explanation."
)


def _build_system_prompt(req: InferenceRequest) -> str:
    task_hint = _TASK_HINTS.get(req.task_type, _DEFAULT_TASK_HINT)
    task_label = req.task_type.replace("_", " ")

    sections: List[str] = []

    if req.problem_framing:
        sections.append(f"PROBLEM\n{_strip_md(req.problem_framing, 400)}")

    if req.compatibility:
        c = req.compatibility
        parts = []
        if c.chosen_dataset:
            parts.append(f"Dataset: {c.chosen_dataset}")
        if c.chosen_model:
            parts.append(f"Model: {c.chosen_model}")
        if c.why_this_pair:
            parts.append(f"Why this pair: {_strip_md(c.why_this_pair, 300)}")
        if c.estimated_effort:
            parts.append(f"Estimated effort: {c.estimated_effort}")
        if parts:
            sections.append("DATASET & MODEL SELECTION\n" + "\n".join(parts))

    if req.dataset_plan:
        sections.append(f"DATASET PLAN\n{_strip_md(req.dataset_plan, 500)}")

    if req.model_plan:
        sections.append(f"MODEL PLAN\n{_strip_md(req.model_plan, 500)}")

    if req.training_plan:
        sections.append(f"TRAINING PLAN\n{_strip_md(req.training_plan, 500)}")

    if req.evaluation_plan:
        sections.append(f"EVALUATION PLAN\n{_strip_md(req.evaluation_plan, 500)}")

    if req.next_steps:
        steps = "\n".join(f"- {s}" for s in req.next_steps[:6])
        sections.append(f"RECOMMENDED NEXT STEPS\n{steps}")

    knowledge_block = ""
    if sections:
        body = "\n\n".join(sections)
        knowledge_block = (
            f"\n\n=== PROJECT KNOWLEDGE BASE ===\n"
            f"The following was produced by the ModelX planning agents for this specific project. "
            f"Use it as your ground truth when answering questions about the model, data, or approach.\n\n"
            f"{body}\n"
            f"=== END KNOWLEDGE BASE ==="
        )

    return (
        f"You are the inference endpoint for '{req.model_name}', a {task_label} model "
        f"built on the '{req.dataset_name or 'project dataset'}' dataset as part of the ModelX platform."
        f"{knowledge_block}\n\n"
        f"How to respond:\n"
        f"- {task_hint}\n"
        f"- Speak in first person as the model ('I predict…', 'Based on my training…').\n"
        f"- When asked about yourself — architecture, dataset, training choices, evaluation metrics — "
        f"draw from the knowledge base above.\n"
        f"- Be concise and direct. Use markdown tables or lists only when they genuinely help.\n"
        f"- If the user's input is ambiguous, ask one focused clarifying question."
    )


def _to_openai_messages(
    system_prompt: str, messages: List[ChatMessage]
) -> List[Dict[str, Any]]:
    result: List[Dict[str, Any]] = [{"role": "system", "content": system_prompt}]
    for msg in messages:
        if msg.role == "assistant" or not msg.images:
            result.append({"role": msg.role, "content": msg.content})
        else:
            parts: List[Dict[str, Any]] = []
            if msg.content.strip():
                parts.append({"type": "text", "text": msg.content})
            for img in msg.images:
                parts.append({
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:{img.mime_type};base64,{img.data}",
                        "detail": "auto",
                    },
                })
            result.append({"role": "user", "content": parts})
    return result


@router.post("/api/inference/chat")
async def inference_chat(req: InferenceRequest):
    try:
        from openai import AsyncOpenAI  # type: ignore
    except ImportError:
        return {"error": "openai package not installed"}

    client = AsyncOpenAI(api_key=os.environ.get("OPENAI_API_KEY", ""))
    system_prompt = _build_system_prompt(req)
    oai_messages = _to_openai_messages(system_prompt, req.messages)

    async def event_stream():
        try:
            stream = await client.chat.completions.create(
                model=INFERENCE_MODEL,
                messages=oai_messages,
                stream=True,
                max_tokens=INFERENCE_MAX_TOKENS,
                temperature=INFERENCE_TEMPERATURE,
            )
            async for chunk in stream:
                delta = chunk.choices[0].delta.content
                if delta:
                    yield f"data: {json.dumps({'token': delta})}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as exc:
            yield f"data: {json.dumps({'error': str(exc)})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
