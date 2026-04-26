from __future__ import annotations

import io
import json
import re
import textwrap
import zipfile
from typing import Any, Dict, List, Optional

from fastapi import APIRouter
from fastapi.responses import Response
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


def _task_metric_hint(task_type: str) -> str:
    return {
        "binary_classification": "accuracy, precision, recall, F1, ROC-AUC",
        "multi_class": "accuracy, macro F1, per-class precision/recall, confusion matrix",
        "regression": "RMSE, MAE, R2",
        "text_classification": "accuracy, macro F1, classification report",
        "image_classification": "accuracy, top-k accuracy, macro F1, confusion matrix",
        "time_series": "RMSE, MAE, MAPE",
    }.get(task_type, "accuracy, F1, task-specific validation checks")


def _model_family(task_type: str) -> str:
    if task_type == "image_classification":
        return "image-classification"
    if task_type == "text_classification":
        return "text-classification"
    if task_type == "time_series":
        return "time-series"
    if task_type == "regression":
        return "regression"
    return "classification"


def _safe_literal(text: Optional[str]) -> str:
    return json.dumps(text or "")


@router.post("/api/deploy/model")
@router.post("/api/ship/model")
async def ship_model(req: ShipRequest):
    in_f, hidden, out_f = _TASK_SHAPES.get(req.task_type, _DEFAULT_SHAPE)

    manifest = {
        "project_title": req.project_title or "ml-project",
        "task_type": req.task_type,
        "model_id": req.model_id or "replace-with-model-id",
        "dataset_name": req.dataset_name or "replace-with-dataset-name",
        "dataset_url": req.dataset_url or "",
        "model_family": _model_family(req.task_type),
        "input_shape_hint": {
            "in_features": in_f,
            "hidden_features": hidden,
            "out_features": out_f,
        },
        "recommended_metrics": _task_metric_hint(req.task_type),
        "deployment": {
            "runtime": "python3.10",
            "serve_command": "uvicorn src.serve:app --host 0.0.0.0 --port 8000",
            "health_endpoint": "/health",
            "predict_endpoint": "/predict",
        },
        "blueprint_context": {
            "problem_framing": _strip_md(req.problem_framing or "", 1200),
            "dataset_plan": _strip_md(req.dataset_plan or "", 1200),
            "model_plan": _strip_md(req.model_plan or "", 1200),
            "training_plan": _strip_md(req.training_plan or "", 1200),
            "evaluation_plan": _strip_md(req.evaluation_plan or "", 1200),
            "why_this_pair": _strip_md(req.why_this_pair or "", 800),
            "estimated_effort": req.estimated_effort or "",
            "next_steps": req.next_steps or [],
        },
    }

    filename = f"{_slug(req.project_title)}_model_config.json"
    return Response(
        content=json.dumps(manifest, indent=2).encode(),
        media_type="application/json",
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


@router.post("/api/deploy/notebook")
@router.post("/api/ship/notebook")
async def ship_notebook(req: ShipRequest):
    metric_hint = _task_metric_hint(req.task_type)
    title = f"# {req.project_title or 'ModelX Deployment'}\n\nModel: `{req.model_id or 'replace-with-model-id'}`  \nDataset: {req.dataset_name or 'replace-with-dataset-name'}  \nTask: {req.task_type.replace('_', ' ')}"
    context_md = f"""## Blueprint Context

{_context_block(req)}

## Plan Excerpts

**Dataset plan:** {_strip_md(req.dataset_plan or '', 900)}

**Training plan:** {_strip_md(req.training_plan or '', 900)}

**Evaluation plan:** {_strip_md(req.evaluation_plan or '', 900)}
"""
    install = "%pip install -q \"torch>=2.2,<3\" \"transformers>=4.44,<5\" \"datasets>=2.20,<4\" \"accelerate>=0.33,<2\" \"scikit-learn>=1.4,<2\" \"pandas>=2.2,<3\" \"numpy>=1.26,<3\" \"evaluate>=0.4,<1\""
    config = f"""from pathlib import Path

PROJECT_TITLE = {_safe_literal(req.project_title or 'ml-project')}
TASK_TYPE = {_safe_literal(req.task_type)}
MODEL_ID = {_safe_literal(req.model_id or 'replace-with-model-id')}
DATASET_NAME = {_safe_literal(req.dataset_name or 'replace-with-dataset-name')}
DATASET_URL = {_safe_literal(req.dataset_url or '')}
OUTPUT_DIR = Path('outputs/model')
SEED = 42
NUM_EPOCHS = 3
BATCH_SIZE = 8
LEARNING_RATE = 2e-5

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
print(PROJECT_TITLE, TASK_TYPE, MODEL_ID, DATASET_NAME)
"""
    imports = """import json
import random
import numpy as np
import pandas as pd
import torch
from datasets import load_dataset, DatasetDict
from sklearn.metrics import accuracy_score, f1_score, mean_absolute_error, mean_squared_error, r2_score
from transformers import (
    AutoTokenizer,
    AutoImageProcessor,
    AutoModelForSequenceClassification,
    AutoModelForImageClassification,
    AutoModelForTokenClassification,
    AutoModelForQuestionAnswering,
    Trainer,
    TrainingArguments,
)

random.seed(SEED)
np.random.seed(SEED)
torch.manual_seed(SEED)
"""
    load_data = """def load_project_dataset():
    \"\"\"Load the dataset. Adjust the fallback block if your selected dataset needs manual download.\"\"\"
    try:
        return load_dataset(DATASET_NAME)
    except Exception as exc:
        print(f'Could not load {DATASET_NAME!r} directly from HuggingFace datasets: {exc}')
        if not DATASET_URL:
            raise
        print('Manual dataset URL:', DATASET_URL)
        raise RuntimeError('Download the dataset manually and adapt this cell to your file paths.')

dataset = load_project_dataset()
dataset
"""
    prep = """# Preprocessing template
# Update TEXT_COLUMN, IMAGE_COLUMN, and LABEL_COLUMN to match your dataset.
TEXT_COLUMN = 'text'
IMAGE_COLUMN = 'image'
LABEL_COLUMN = 'label'

if 'train' in dataset and 'validation' not in dataset:
    split = dataset['train'].train_test_split(test_size=0.2, seed=SEED, stratify_by_column=LABEL_COLUMN if LABEL_COLUMN in dataset['train'].column_names else None)
    dataset = DatasetDict(train=split['train'], validation=split['test'])

if TASK_TYPE in {'text_classification', 'binary_classification', 'multi_class'}:
    tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
    def preprocess(batch):
        return tokenizer(batch[TEXT_COLUMN], truncation=True, padding='max_length', max_length=256)
    tokenized = dataset.map(preprocess, batched=True)
elif TASK_TYPE == 'image_classification':
    processor = AutoImageProcessor.from_pretrained(MODEL_ID)
    def preprocess(batch):
        images = [img.convert('RGB') for img in batch[IMAGE_COLUMN]]
        return processor(images=images)
    tokenized = dataset.map(preprocess, batched=True)
else:
    tokenized = dataset

tokenized
"""
    train_code = """num_labels = len(set(tokenized['train'][LABEL_COLUMN])) if LABEL_COLUMN in tokenized['train'].column_names else 2

if TASK_TYPE == 'image_classification':
    model = AutoModelForImageClassification.from_pretrained(MODEL_ID, num_labels=num_labels, ignore_mismatched_sizes=True)
else:
    model = AutoModelForSequenceClassification.from_pretrained(MODEL_ID, num_labels=num_labels, ignore_mismatched_sizes=True)

def compute_metrics(eval_pred):
    logits, labels = eval_pred
    preds = np.argmax(logits, axis=-1)
    return {
        'accuracy': accuracy_score(labels, preds),
        'macro_f1': f1_score(labels, preds, average='macro'),
    }

args = TrainingArguments(
    output_dir=str(OUTPUT_DIR),
    num_train_epochs=NUM_EPOCHS,
    per_device_train_batch_size=BATCH_SIZE,
    per_device_eval_batch_size=BATCH_SIZE,
    learning_rate=LEARNING_RATE,
    evaluation_strategy='epoch',
    save_strategy='epoch',
    load_best_model_at_end=True,
    metric_for_best_model='macro_f1',
    report_to=[],
)

trainer = Trainer(
    model=model,
    args=args,
    train_dataset=tokenized['train'],
    eval_dataset=tokenized.get('validation'),
    compute_metrics=compute_metrics,
)

trainer.train()
"""
    eval_code = f"""metrics = trainer.evaluate()
print(json.dumps(metrics, indent=2))
trainer.save_model(str(OUTPUT_DIR))
if 'tokenizer' in globals():
    tokenizer.save_pretrained(str(OUTPUT_DIR))
if 'processor' in globals():
    processor.save_pretrained(str(OUTPUT_DIR))

print('Recommended metrics from the blueprint: {metric_hint}')
print('Saved model to', OUTPUT_DIR)
"""
    cells: List[Dict[str, Any]] = [
        _md_cell(title),
        _md_cell(context_md),
        _code_cell(install),
        _code_cell(imports),
        _code_cell(config),
        _code_cell(load_data),
        _code_cell(prep),
        _code_cell(train_code),
        _code_cell(eval_code),
        _md_cell("## Deploy\n\nUse the generated repository ZIP for a serving API scaffold, or push `outputs/model` to HuggingFace Hub after reviewing the model card and license."),
    ]
    notebook = _build_notebook(cells)

    filename = f"{_slug(req.project_title)}_training.ipynb"
    return Response(
        content=json.dumps(notebook, indent=2).encode(),
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/api/deploy/repo")
@router.post("/api/ship/repo")
async def ship_repo(req: ShipRequest):
    project_slug = _slug(req.project_title or "ml-project")
    title = req.project_title or "ModelX Deployment"
    model_id = req.model_id or "replace-with-model-id"
    dataset_name = req.dataset_name or "replace-with-dataset-name"

    readme = f"""# {title}

Starter deployment repository generated from a ModelX blueprint.

## Blueprint Summary

{_context_block(req)}

## Quick Start

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python src/train.py
python src/evaluate.py
uvicorn src.serve:app --reload
```

## Project Structure

| Path | Purpose |
| --- | --- |
| `config.yaml` | Model, dataset, and training settings |
| `src/dataset.py` | Dataset loading and split helpers |
| `src/model.py` | Model loading and task mapping |
| `src/train.py` | Training entrypoint |
| `src/evaluate.py` | Evaluation entrypoint |
| `src/serve.py` | Minimal FastAPI prediction service |
| `model_config.json` | Deploy manifest generated by ModelX |

## Recommended Metrics

{_task_metric_hint(req.task_type)}

## Next Steps

{chr(10).join(f"- {step}" for step in (req.next_steps or ["Review the dataset", "Train a baseline", "Evaluate on held-out data"]))}

## Notes

This is a starter scaffold. Review dataset licensing, model licensing, labels, preprocessing, and metrics before production use.
"""

    requirements = "\n".join([
        "torch>=2.2,<3",
        "transformers>=4.44,<5",
        "datasets>=2.20,<4",
        "accelerate>=0.33,<2",
        "scikit-learn>=1.4,<2",
        "pandas>=2.2,<3",
        "numpy>=1.26,<3",
        "fastapi>=0.110,<1",
        "uvicorn[standard]>=0.29,<1",
        "pyyaml>=6.0,<7",
        "pillow>=10,<12",
        "",
    ])

    config_yaml = f"""project_title: {json.dumps(title)}
task_type: {json.dumps(req.task_type)}
model_id: {json.dumps(model_id)}
dataset_name: {json.dumps(dataset_name)}
dataset_url: {json.dumps(req.dataset_url or "")}
label_column: label
text_column: text
image_column: image
output_dir: outputs/model
seed: 42
num_epochs: 3
batch_size: 8
learning_rate: 0.00002
validation_size: 0.2
metrics: {json.dumps(_task_metric_hint(req.task_type))}
"""

    model_config = {
        "project_title": title,
        "task_type": req.task_type,
        "model_id": model_id,
        "dataset_name": dataset_name,
        "dataset_url": req.dataset_url or "",
        "metrics": _task_metric_hint(req.task_type),
        "problem_framing": _strip_md(req.problem_framing or "", 1200),
        "training_plan": _strip_md(req.training_plan or "", 1200),
        "evaluation_plan": _strip_md(req.evaluation_plan or "", 1200),
    }

    dataset_py = '''"""Dataset loading utilities for the generated ModelX project."""

from __future__ import annotations

from typing import Any

from datasets import DatasetDict, load_dataset


def load_project_dataset(config: dict[str, Any]) -> DatasetDict:
    """Load a HuggingFace dataset and create a validation split if needed."""
    dataset_name = config["dataset_name"]
    dataset = load_dataset(dataset_name)
    if "train" in dataset and "validation" not in dataset:
        split = dataset["train"].train_test_split(
            test_size=float(config.get("validation_size", 0.2)),
            seed=int(config.get("seed", 42)),
        )
        dataset = DatasetDict(train=split["train"], validation=split["test"])
    return dataset
'''

    model_py = '''"""Model loading helpers for the generated ModelX project."""

from __future__ import annotations

from typing import Any

from transformers import (
    AutoImageProcessor,
    AutoModelForImageClassification,
    AutoModelForSequenceClassification,
    AutoTokenizer,
)


def load_model_and_processor(config: dict[str, Any], num_labels: int = 2):
    """Load a task-appropriate HuggingFace model and processor/tokenizer."""
    model_id = config["model_id"]
    task_type = config["task_type"]
    if task_type == "image_classification":
        processor = AutoImageProcessor.from_pretrained(model_id)
        model = AutoModelForImageClassification.from_pretrained(
            model_id,
            num_labels=num_labels,
            ignore_mismatched_sizes=True,
        )
        return model, processor

    tokenizer = AutoTokenizer.from_pretrained(model_id)
    model = AutoModelForSequenceClassification.from_pretrained(
        model_id,
        num_labels=num_labels,
        ignore_mismatched_sizes=True,
    )
    return model, tokenizer
'''

    train_py = '''"""Training entrypoint for the generated ModelX project."""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import yaml
from sklearn.metrics import accuracy_score, f1_score
from transformers import Trainer, TrainingArguments

from dataset import load_project_dataset
from model import load_model_and_processor


def main() -> None:
    config = yaml.safe_load(Path("config.yaml").read_text())
    dataset = load_project_dataset(config)
    label_column = config.get("label_column", "label")
    num_labels = len(set(dataset["train"][label_column])) if label_column in dataset["train"].column_names else 2
    model, processor = load_model_and_processor(config, num_labels=num_labels)

    def preprocess(batch):
        if config["task_type"] == "image_classification":
            images = [img.convert("RGB") for img in batch[config.get("image_column", "image")]]
            return processor(images=images)
        return processor(
            batch[config.get("text_column", "text")],
            truncation=True,
            padding="max_length",
            max_length=256,
        )

    tokenized = dataset.map(preprocess, batched=True)

    def compute_metrics(eval_pred):
        logits, labels = eval_pred
        preds = np.argmax(logits, axis=-1)
        return {"accuracy": accuracy_score(labels, preds), "macro_f1": f1_score(labels, preds, average="macro")}

    args = TrainingArguments(
        output_dir=config.get("output_dir", "outputs/model"),
        num_train_epochs=config.get("num_epochs", 3),
        per_device_train_batch_size=config.get("batch_size", 8),
        per_device_eval_batch_size=config.get("batch_size", 8),
        learning_rate=config.get("learning_rate", 2e-5),
        evaluation_strategy="epoch",
        save_strategy="epoch",
        load_best_model_at_end=True,
        report_to=[],
    )
    trainer = Trainer(
        model=model,
        args=args,
        train_dataset=tokenized["train"],
        eval_dataset=tokenized.get("validation"),
        compute_metrics=compute_metrics,
    )
    trainer.train()
    metrics = trainer.evaluate()
    Path("outputs").mkdir(exist_ok=True)
    Path("outputs/metrics.json").write_text(json.dumps(metrics, indent=2))
    trainer.save_model(config.get("output_dir", "outputs/model"))


if __name__ == "__main__":
    main()
'''

    evaluate_py = '''"""Evaluation entrypoint for the generated ModelX project."""

from __future__ import annotations

import json
from pathlib import Path


def main() -> None:
    metrics_path = Path("outputs/metrics.json")
    if not metrics_path.exists():
        raise SystemExit("No metrics found. Run `python src/train.py` first.")
    print(json.dumps(json.loads(metrics_path.read_text()), indent=2))


if __name__ == "__main__":
    main()
'''

    serve_py = '''"""Minimal FastAPI serving scaffold for a trained ModelX model."""

from __future__ import annotations

from fastapi import FastAPI
from pydantic import BaseModel


app = FastAPI(title="ModelX Deployment")


class PredictRequest(BaseModel):
    inputs: str


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/predict")
def predict(req: PredictRequest):
    # Replace this stub with model loading and inference from outputs/model.
    return {"prediction": "replace-with-model-output", "inputs": req.inputs}
'''

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
        add("model_config.json", json.dumps(model_config, indent=2))
        add(".gitignore", gitignore)
        add("src/__init__.py", "")
        add("src/dataset.py", dataset_py)
        add("src/model.py", model_py)
        add("src/train.py", train_py)
        add("src/evaluate.py", evaluate_py)
        add("src/serve.py", serve_py)
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
