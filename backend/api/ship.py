from __future__ import annotations

import io
import json
import os
import re
import textwrap
import zipfile
from typing import Any, Dict, List, Optional

from fastapi import APIRouter
from fastapi.responses import Response, StreamingResponse
from pydantic import BaseModel

router = APIRouter()


class ShipRequest(BaseModel):
    task_type: str
    model_id: str
    dataset_name: str
    dataset_url: Optional[str] = ""
    project_title: Optional[str] = "ml-project"
    problem_framing: Optional[str] = ""
    dataset_plan: Optional[str] = ""
    model_plan: Optional[str] = ""
    training_plan: Optional[str] = ""
    evaluation_plan: Optional[str] = ""
    next_steps: Optional[List[str]] = None
    why_this_pair: Optional[str] = ""
    estimated_effort: Optional[str] = ""


def _slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")[:40] or "ml-project"


def _strip_md(text: str, max_chars: int = 500) -> str:
    if not text:
        return ""
    t = re.sub(r"#{1,6}\s+", "", text)
    t = re.sub(r"\*{1,3}([^*]+)\*{1,3}", r"\1", t)
    t = re.sub(r"`[^`]*`", "", t)
    t = re.sub(r"\[([^\]]+)\]\([^\)]+\)", r"\1", t)
    t = re.sub(r"\n{3,}", "\n\n", t).strip()
    return t[:max_chars] + ("…" if len(t) > max_chars else "")


def _context_block(req: ShipRequest) -> str:
    lines = [
        f"Project title: {req.project_title}",
        f"ML task type: {req.task_type.replace('_', ' ')}",
        f"HuggingFace model: {req.model_id}",
        f"Dataset: {req.dataset_name}" + (f" ({req.dataset_url})" if req.dataset_url else ""),
    ]
    if req.problem_framing:
        lines.append(f"Problem: {_strip_md(req.problem_framing, 300)}")
    if req.why_this_pair:
        lines.append(f"Why this model+dataset pair: {_strip_md(req.why_this_pair, 300)}")
    if req.model_plan:
        lines.append(f"Model plan: {_strip_md(req.model_plan, 400)}")
    if req.training_plan:
        lines.append(f"Training plan: {_strip_md(req.training_plan, 400)}")
    if req.evaluation_plan:
        lines.append(f"Evaluation plan: {_strip_md(req.evaluation_plan, 400)}")
    return "\n".join(lines)


def _openai_client():
    from openai import OpenAI  # type: ignore
    return OpenAI(api_key=os.environ.get("OPENAI_API_KEY", ""))


def _gpt5(prompt: str, system: str, max_tokens: int = 4096) -> str:
    client = _openai_client()
    resp = client.chat.completions.create(
        model="gpt-5",
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": prompt},
        ],
        max_tokens=max_tokens,
        temperature=0.2,
    )
    return resp.choices[0].message.content or ""


def _extract_code(text: str, lang: str = "") -> str:
    pattern = rf"```{lang}?\s*\n?(.*?)```" if lang else r"```[a-z]*\s*\n?(.*?)```"
    match = re.search(pattern, text, re.DOTALL)
    return match.group(1).strip() if match else text.strip()


_TASK_SHAPES: dict[str, tuple[int, int, int]] = {
    "binary_classification":  (128, 256, 2),
    "multi_class":            (128, 256, 10),
    "regression":             (128, 256, 1),
    "text_classification":    (128, 512, 5),
    "image_classification":   (512, 1024, 10),
    "time_series":            (64,  128, 1),
    "object_detection":       (512, 1024, 80),
    "named_entity_recognition": (128, 256, 9),
    "question_answering":     (128, 512, 2),
    "summarization":          (256, 512, 256),
    "translation":            (256, 512, 256),
}

_DEFAULT_SHAPE = (128, 256, 2)


@router.post("/api/ship/model")
async def ship_model(req: ShipRequest):
    import torch
    import torch.nn as nn

    in_f, hidden, out_f = _TASK_SHAPES.get(req.task_type, _DEFAULT_SHAPE)

    model = nn.Sequential(
        nn.Linear(in_f, hidden),
        nn.LayerNorm(hidden),
        nn.GELU(),
        nn.Dropout(0.1),
        nn.Linear(hidden, hidden // 2),
        nn.LayerNorm(hidden // 2),
        nn.GELU(),
        nn.Dropout(0.1),
        nn.Linear(hidden // 2, out_f),
    )

    for module in model.modules():
        if isinstance(module, nn.Linear):
            nn.init.xavier_uniform_(module.weight)
            nn.init.zeros_(module.bias)

    buf = io.BytesIO()
    torch.save(
        {
            "model_state_dict": model.state_dict(),
            "task_type": req.task_type,
            "model_id": req.model_id,
            "dataset": req.dataset_name,
            "architecture": {
                "in_features": in_f,
                "hidden": hidden,
                "out_features": out_f,
            },
        },
        buf,
    )
    buf.seek(0)

    filename = f"{_slug(req.project_title)}_model.pt"
    return Response(
        content=buf.read(),
        media_type="application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def _build_notebook(cells: List[Dict[str, Any]]) -> Dict[str, Any]:
    return {
        "nbformat": 4,
        "nbformat_minor": 5,
        "metadata": {
            "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
            "language_info": {"name": "python", "version": "3.10.0"},
        },
        "cells": cells,
    }


def _md_cell(source: str) -> Dict[str, Any]:
    return {"cell_type": "markdown", "metadata": {}, "source": source}


def _code_cell(source: str) -> Dict[str, Any]:
    return {
        "cell_type": "code",
        "metadata": {},
        "source": source,
        "outputs": [],
        "execution_count": None,
    }


@router.post("/api/ship/notebook")
async def ship_notebook(req: ShipRequest):
    system = (
        "You are a senior ML engineer writing a production-quality Jupyter notebook. "
        "Write clean, correct, well-commented Python code. "
        "Use only stable library APIs (transformers, datasets, torch, sklearn, pandas, numpy). "
        "Pin package versions in install commands. "
        "Every code cell must be runnable as-is."
    )

    task_metric_hint = {
        "binary_classification": "accuracy, f1_score, roc_auc_score",
        "multi_class": "accuracy, f1_score (macro), classification_report",
        "regression": "mean_squared_error, mean_absolute_error, r2_score",
        "text_classification": "accuracy, f1_score (macro), classification_report",
        "image_classification": "accuracy, f1_score (macro), classification_report",
        "time_series": "mean_squared_error, mean_absolute_error",
    }.get(req.task_type, "accuracy, f1_score")

    prompt = f"""
{_context_block(req)}
Metrics to use: {task_metric_hint}

Generate a complete end-to-end Jupyter notebook as a JSON object (valid .ipynb format).

The notebook must contain exactly these sections (as separate cells):

1. Markdown title cell: project name, model, dataset, task type
2. Code cell: pip install all required packages with pinned versions
3. Code cell: all imports
4. Code cell: configuration variables (MODEL_ID, DATASET_NAME, NUM_EPOCHS, BATCH_SIZE, LR, OUTPUT_DIR, SEED)
5. Code cell: load and explore the dataset (use HuggingFace `datasets` library if the dataset is available there, otherwise use pandas with a download URL)
6. Code cell: preprocessing and tokenization/feature extraction appropriate for '{req.task_type}' and '{req.model_id}'
7. Code cell: load the model from HuggingFace with the correct AutoModel class for '{req.task_type}'
8. Code cell: training loop using HuggingFace Trainer API with TrainingArguments
9. Code cell: evaluation with {task_metric_hint}
10. Code cell: save the model and tokenizer to OUTPUT_DIR
11. Markdown cell: next steps and how to push to HuggingFace Hub

Return ONLY a valid JSON object matching the .ipynb format (nbformat 4). No markdown fences, no extra text.
""".strip()

    raw = _gpt5(prompt, system, max_tokens=6000)

    notebook: Optional[Dict] = None
    for attempt in [raw, _extract_code(raw, "json"), _extract_code(raw)]:
        try:
            notebook = json.loads(attempt)
            if "cells" in notebook:
                break
        except (json.JSONDecodeError, ValueError):
            continue

    if not notebook or "cells" not in notebook:
        title = f"# {req.project_title}\n\nModel: `{req.model_id}` | Dataset: {req.dataset_name} | Task: {req.task_type.replace('_', ' ')}"
        code_blocks = re.findall(r"```python\n?(.*?)```", raw, re.DOTALL)
        cells: List[Dict] = [_md_cell(title)]
        for block in code_blocks:
            cells.append(_code_cell(block.strip()))
        notebook = _build_notebook(cells)

    filename = f"{_slug(req.project_title)}_training.ipynb"
    return Response(
        content=json.dumps(notebook, indent=2).encode(),
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/api/ship/repo")
async def ship_repo(req: ShipRequest):
    project_slug = _slug(req.project_title or "ml-project")
    system = (
        "You are a senior ML engineer creating a well-structured, production-ready GitHub repository. "
        "Write clean, correct, documented Python code. "
        "Every file must be complete and immediately usable. "
        "Use standard library conventions, type hints, and docstrings."
    )
    ctx = _context_block(req)

    def gen_file(filename: str, instructions: str, max_tokens: int = 2000) -> str:
        resp = _gpt5(
            f"{ctx}\n\nFile to generate: {filename}\n\n{instructions}\n\nReturn ONLY the file content, no extra commentary.",
            system,
            max_tokens=max_tokens,
        )
        return _extract_code(resp) if "```" in resp else resp.strip()

    readme = gen_file("README.md", f"""
Write a comprehensive README.md for this ML project. Include:
- Project title and one-line description
- Model ({req.model_id}) and dataset ({req.dataset_name}) badges/info
- Quick start (install → train → evaluate)
- Project structure table
- Configuration options
- How to run training
- Expected results / metrics
- License section (MIT)
Use proper markdown formatting.
""", max_tokens=1500)

    requirements = gen_file("requirements.txt", f"""
Generate a requirements.txt with pinned versions for all packages needed to:
- Load and fine-tune {req.model_id} from HuggingFace
- Work with the dataset {req.dataset_name}
- Train a {req.task_type.replace('_', ' ')} model
- Evaluate with appropriate metrics
Include: torch, transformers, datasets, accelerate, scikit-learn, pandas, numpy, tqdm, pyyaml.
Format: one package==version per line. No comments.
""", max_tokens=300)

    config_yaml = gen_file("config.yaml", f"""
Generate a config.yaml file with all training hyperparameters:
model_id: {req.model_id}
dataset_name: {req.dataset_name}
task_type: {req.task_type}
num_epochs, batch_size, learning_rate, warmup_steps, weight_decay, seed, output_dir, max_length (if text), etc.
Use sensible defaults for fine-tuning {req.model_id}.
""", max_tokens=400)

    dataset_py = gen_file("src/dataset.py", f"""
Write a complete src/dataset.py module that:
1. Loads the dataset '{req.dataset_name}' (try HuggingFace datasets first, fallback to pandas + URL)
2. Defines a preprocessing function appropriate for {req.task_type} and {req.model_id}
3. Returns train/val/test splits as HuggingFace Dataset objects
4. Handles tokenization/feature extraction for the model
Include type hints and docstrings.
""", max_tokens=2000)

    model_py = gen_file("src/model.py", f"""
Write a complete src/model.py module that:
1. Loads '{req.model_id}' using the correct AutoModel class for {req.task_type}
2. Defines a get_model() function that returns the model and tokenizer/processor
3. Handles num_labels based on the task
4. Includes a function to save and load the model
Include type hints and docstrings.
""", max_tokens=1500)

    train_py = gen_file("src/train.py", f"""
Write a complete src/train.py script that:
1. Parses config from config.yaml
2. Calls dataset.py to get data splits
3. Calls model.py to get the model
4. Uses HuggingFace Trainer with TrainingArguments
5. Trains and saves the best checkpoint
6. Prints training metrics
7. Is runnable with: python src/train.py
Include type hints, docstrings, and if __name__ == '__main__'.
""", max_tokens=2000)

    evaluate_py = gen_file("src/evaluate.py", f"""
Write a complete src/evaluate.py script that:
1. Loads the saved model from the output directory
2. Runs inference on the test set
3. Computes and prints all relevant metrics for {req.task_type}: accuracy, F1, etc.
4. Saves a classification report or metrics dict to outputs/metrics.json
5. Is runnable with: python src/evaluate.py
Include type hints, docstrings, and if __name__ == '__main__'.
""", max_tokens=1500)

    gitignore = textwrap.dedent("""\
        __pycache__/
        *.py[cod]
        *.egg-info/
        dist/
        build/
        .env
        .venv/
        venv/
        outputs/
        *.pt
        *.bin
        wandb/
        .DS_Store
        *.log
    """)

    data_readme = textwrap.dedent(f"""\
        # Data

        This project uses: **{req.dataset_name}**
        {"URL: " + req.dataset_url if req.dataset_url else ""}

        ## Download

        The dataset is loaded automatically by `src/dataset.py` using the HuggingFace `datasets` library.
        If it requires manual download, follow the instructions at the dataset URL above.
    """)

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        def add(path: str, content: str):
            zf.writestr(f"{project_slug}/{path}", content)

        add("README.md", readme)
        add("requirements.txt", requirements)
        add("config.yaml", config_yaml)
        add(".gitignore", gitignore)
        add("src/__init__.py", "")
        add("src/dataset.py", dataset_py)
        add("src/model.py", model_py)
        add("src/train.py", train_py)
        add("src/evaluate.py", evaluate_py)
        add("data/README.md", data_readme)
        add("outputs/.gitkeep", "")
        add("notebooks/.gitkeep", "")

    buf.seek(0)
    filename = f"{project_slug}.zip"
    return Response(
        content=buf.read(),
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
