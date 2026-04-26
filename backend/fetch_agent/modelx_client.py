from __future__ import annotations

import asyncio
import re
from dataclasses import dataclass
from typing import Any, Dict, Optional

import httpx


DEFAULT_BACKEND_URL = "http://127.0.0.1:8000"
DEFAULT_POLL_INTERVAL_SECONDS = 2.0
DEFAULT_TIMEOUT_SECONDS = 240.0
FIELD_LABEL_PATTERN = re.compile(
    r"(?im)(?:^|\n)\s*(?:@\S+\s+)?"
    r"(Project\s+Title|ML\s+Idea|Idea|Goal|Skill\s+Level|Data\s+Status|"
    r"Data\s+Description|Constraints)\s*:?\s*"
)

FIELD_ALIASES = {
    "project title": "project_title",
    "ml idea": "idea",
    "idea": "idea",
    "goal": "goal",
    "skill level": "skill_level",
    "data status": "data_status",
    "data description": "data_description",
    "constraints": "constraints",
}


class ModelXAgentError(RuntimeError):
    """Raised when the ModelX Agentverse adapter cannot complete a plan."""


@dataclass(frozen=True)
class ModelXClientConfig:
    backend_url: str = DEFAULT_BACKEND_URL
    poll_interval_seconds: float = DEFAULT_POLL_INTERVAL_SECONDS
    timeout_seconds: float = DEFAULT_TIMEOUT_SECONDS


def build_plan_request(user_text: str) -> Dict[str, Any]:
    raw_text = user_text.strip()
    text = " ".join(raw_text.split())
    if not text:
        raise ModelXAgentError("Please describe the ML idea you want ModelX to plan.")

    fields = _extract_labeled_fields(raw_text)
    idea = fields.get("idea") or text
    project_title = fields.get("project_title") or _derive_project_title(idea)
    goal = fields.get("goal") or f"Create a beginner-friendly machine learning blueprint for: {idea[:500]}"
    context_text = " ".join(value for value in fields.values() if value) or text

    return {
        "project_title": project_title,
        "idea": idea,
        "goal": goal,
        "skill_level": _normalize_skill_level(fields.get("skill_level")) or _infer_skill_level(context_text),
        "data_status": _normalize_data_status(fields.get("data_status")) or _infer_data_status(context_text),
        "data_description": fields.get("data_description") or _infer_data_description(context_text),
        "constraints": fields.get("constraints")
        or "Generated from an ASI:One chat request through the ModelX Agentverse adapter.",
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
        _section("Agent Debate Summary", result.get("debate_summary")),
    ]

    if compatibility:
        sections.append(_section("Recommended Dataset + Model Pair", _format_compatibility(compatibility)))

    if datasets:
        sections.append(_section("Top Kaggle Leads", _format_datasets(datasets)))

    if models:
        sections.append(_section("Top HuggingFace Leads", _format_models(models)))

    sections.append(_section("Training Loop Blueprint", _format_training_loop(result, compatibility)))

    if next_steps:
        sections.append(_section("Build Checklist", _format_build_checklist(next_steps)))

    sections.append(
        _section(
            "Prototype And Deploy From The Web App",
            (
                "Open this project in the ModelX web app to run the training simulation, compare a custom model "
                "against the recommended open-source model, test the inference chat, and download a model config, "
                "starter notebook, or deployable repository ZIP."
            ),
        )
    )

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


def _extract_labeled_fields(text: str) -> Dict[str, str]:
    matches = list(FIELD_LABEL_PATTERN.finditer(text))
    if not matches:
        return {}

    fields: Dict[str, str] = {}
    for index, match in enumerate(matches):
        raw_label = " ".join(match.group(1).lower().split())
        field_name = FIELD_ALIASES.get(raw_label)
        if not field_name:
            continue

        value_start = match.end()
        value_end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        value = text[value_start:value_end].strip(" \n\r\t:-")
        value = re.sub(r"\s+", " ", value).strip()
        if value:
            fields[field_name] = value

    return fields


def _normalize_skill_level(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    lowered = value.lower()
    if "intermediate" in lowered or "advanced" in lowered or "experienced" in lowered:
        return "intermediate"
    if "python" in lowered or "some" in lowered or "coding" in lowered:
        return "some_python"
    if "beginner" in lowered or "new" in lowered:
        return "beginner"
    return None


def _normalize_data_status(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    lowered = value.lower()
    if "have" in lowered or "already" in lowered or "csv" in lowered or "spreadsheet" in lowered:
        return "have_dataset"
    if "public" in lowered or "find" in lowered or "kaggle" in lowered or "need" in lowered:
        return "need_public_dataset"
    if "no" in lowered or "none" in lowered:
        return "no_dataset"
    return None


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


def _format_compatibility(compatibility: Dict[str, Any]) -> str:
    lines = [
        f"Dataset: {compatibility.get('chosen_dataset', 'Not selected')}",
        f"Dataset URL: {compatibility.get('chosen_dataset_url', 'Not provided')}",
        f"Model: {compatibility.get('chosen_model', 'Not selected')}",
        f"Model URL: {compatibility.get('chosen_model_url', 'Not provided')}",
        f"Compatibility: {compatibility.get('compatibility_score', 'Not scored')}",
    ]

    if compatibility.get("estimated_effort"):
        lines.append(f"Estimated preprocessing effort: {compatibility['estimated_effort']}")
    if compatibility.get("why_this_pair"):
        lines.append(f"Why this pair: {compatibility['why_this_pair']}")

    dimensions = compatibility.get("preprocessing_dimensions") or []
    if dimensions:
        lines.append("")
        lines.append("Preprocessing roadmap:")
        for item in dimensions:
            if not isinstance(item, dict):
                continue
            dimension = item.get("dimension", "Preprocessing")
            status = item.get("status", "Minor Prep")
            description = item.get("description", "")
            lines.append(f"- **{dimension}** ({status}): {description}")
            for step in item.get("steps", []):
                lines.append(f"  - {step}")

    return "\n".join(lines)


def _format_datasets(datasets: list) -> str:
    lines = []
    for index, item in enumerate(datasets[:5]):
        if not isinstance(item, dict):
            continue
        rank = item.get("rank", index + 1)
        title = item.get("title", "Untitled dataset")
        url = item.get("url", "")
        reason = item.get("relevance_reason") or item.get("description") or ""
        votes = item.get("vote_count", 0)
        downloads = item.get("download_count", 0)
        lines.append(f"{rank}. **{title}** - {url}")
        if reason:
            lines.append(f"   Why it fits: {reason}")
        lines.append(f"   Signals: {votes} votes, {downloads} downloads")
    return "\n".join(lines)


def _format_models(models: list) -> str:
    lines = []
    for index, item in enumerate(models[:5]):
        if not isinstance(item, dict):
            continue
        rank = item.get("rank", index + 1)
        model_id = item.get("model_id", "unknown/model")
        url = item.get("url", "")
        task_type = item.get("task_type", "unknown task")
        reason = item.get("relevance_reason") or ""
        downloads = item.get("downloads", 0)
        likes = item.get("likes", 0)
        lines.append(f"{rank}. **{model_id}** ({task_type}) - {url}")
        if reason:
            lines.append(f"   Why it fits: {reason}")
        lines.append(f"   Signals: {downloads} downloads, {likes} likes")
    return "\n".join(lines)


def _format_training_loop(result: Dict[str, Any], compatibility: Dict[str, Any]) -> str:
    model_name = compatibility.get("chosen_model") or "the recommended baseline model"
    dataset_name = compatibility.get("chosen_dataset") or "the selected dataset"
    training_plan = result.get("training_plan") or "Use the training recipe from the blueprint."
    evaluation_plan = result.get("evaluation_plan") or "Evaluate with task-appropriate validation metrics."

    return "\n".join(
        [
            "Use this as the first implementation loop:",
            "",
            "```python",
            f"dataset = load_dataset({dataset_name!r})",
            "train, val, test = split_without_leakage(dataset)",
            "train = preprocess(train)",
            "val = preprocess(val)",
            "test = preprocess(test)",
            "",
            f"model = load_or_create_model({model_name!r})",
            "for epoch in range(num_epochs):",
            "    model.train(train)",
            "    val_metrics = model.evaluate(val)",
            "    print(epoch, val_metrics)",
            "    if validation_score_stops_improving(val_metrics):",
            "        break",
            "",
            "test_metrics = model.evaluate(test)",
            "save_model(model)",
            "```",
            "",
            f"Training focus: {training_plan}",
            "",
            f"Evaluation focus: {evaluation_plan}",
        ]
    )


def _format_build_checklist(next_steps: list) -> str:
    checklist = [
        "Create or download the dataset and inspect the columns, labels, and missing values.",
        "Run the preprocessing roadmap from the compatibility section.",
        "Train the simple baseline first before trying the recommended open-source model.",
        "Track validation metrics every epoch or training run.",
        "Evaluate once on the held-out test set after decisions are finalized.",
    ]
    for step in next_steps:
        if isinstance(step, str) and step not in checklist:
            checklist.append(step)

    return "\n".join(f"{index + 1}. {step}" for index, step in enumerate(checklist[:8]))
