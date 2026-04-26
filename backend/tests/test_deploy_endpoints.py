import json
import zipfile
from io import BytesIO

from fastapi.testclient import TestClient

from main import app


client = TestClient(app)


def _payload():
    return {
        "task_type": "image_classification",
        "model_id": "google/vit-base-patch16-224",
        "dataset_name": "GTSRB",
        "dataset_url": "https://www.kaggle.com/datasets/meowmeowmeowmeowmeow/gtsrb-german-traffic-sign",
        "project_title": "Traffic Sign Recognition",
        "problem_framing": "Classify traffic sign images.",
        "dataset_plan": "Use GTSRB.",
        "model_plan": "Fine-tune ViT.",
        "training_plan": "Use 70/15/15 train, validation, and test splits.",
        "evaluation_plan": "Measure accuracy and macro F1.",
        "next_steps": ["Download dataset", "Train baseline"],
    }


def test_deploy_model_returns_json_manifest():
    resp = client.post("/api/deploy/model", json=_payload())

    assert resp.status_code == 200
    assert resp.headers["content-type"].startswith("application/json")
    data = resp.json()
    assert data["task_type"] == "image_classification"
    assert data["deployment"]["predict_endpoint"] == "/predict"


def test_deploy_notebook_returns_valid_ipynb():
    resp = client.post("/api/deploy/notebook", json=_payload())

    assert resp.status_code == 200
    notebook = resp.json()
    assert notebook["nbformat"] == 4
    assert len(notebook["cells"]) >= 8
    assert "Traffic Sign Recognition" in "".join(notebook["cells"][0]["source"])


def test_deploy_repo_returns_zip_with_expected_files():
    resp = client.post("/api/deploy/repo", json=_payload())

    assert resp.status_code == 200
    assert resp.headers["content-type"].startswith("application/zip")
    with zipfile.ZipFile(BytesIO(resp.content)) as zf:
        names = set(zf.namelist())
        assert "traffic-sign-recognition/README.md" in names
        assert "traffic-sign-recognition/src/serve.py" in names
        manifest = json.loads(zf.read("traffic-sign-recognition/model_config.json"))
        assert manifest["model_id"] == "google/vit-base-patch16-224"
