from fetch_agent.modelx_client import build_plan_request, format_blueprint_response


def test_build_plan_request_defaults_to_beginner_and_no_dataset():
    payload = build_plan_request("I want to detect plant disease from leaf images")

    assert payload["project_title"] == "I want to detect plant disease from leaf"
    assert payload["skill_level"] == "beginner"
    assert payload["data_status"] == "no_dataset"
    assert "leaf images" in payload["idea"]


def test_build_plan_request_detects_existing_data_and_python_experience():
    payload = build_plan_request("I have a CSV and know some Python. Predict customer churn.")

    assert payload["skill_level"] == "some_python"
    assert payload["data_status"] == "have_dataset"


def test_format_blueprint_response_includes_submission_friendly_sections():
    response = format_blueprint_response(
        {
            "project_data": {"project_title": "Plant Disease Detector"},
            "result": {
                "recommendation": "START_SIMPLE",
                "summary": "Start with labeled leaf images.",
                "problem_framing": "Classify visible disease categories.",
                "dataset_plan": "Use a labeled plant disease dataset.",
                "model_plan": "Fine-tune an image classifier.",
                "training_plan": "Split train/validation/test and augment images.",
                "evaluation_plan": "Use accuracy and per-class recall.",
                "next_steps": ["Pick a dataset", "Train a baseline"],
                "kaggle_datasets": [{"rank": 1, "title": "PlantVillage", "url": "https://www.kaggle.com/x"}],
                "huggingface_models": [{"rank": 1, "model_id": "google/vit-base", "url": "https://huggingface.co/google/vit-base"}],
                "compatibility_result": {
                    "chosen_dataset": "PlantVillage",
                    "chosen_model": "google/vit-base",
                    "compatibility_score": "High",
                    "why_this_pair": "Both are image-classification friendly.",
                },
            },
        }
    )

    assert "# Plant Disease Detector" in response
    assert "Recommended Dataset + Model Pair" in response
    assert "PlantVillage" in response
    assert "google/vit-base" in response
