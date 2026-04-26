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


def test_build_plan_request_parses_asi_labeled_fields():
    payload = build_plan_request(
        """@fastermodels Project Title Daily Recovery Score Estimator

        ML Idea Train a machine learning model to predict a daily recovery score.

        Goal Predict a continuous score from 0 to 100 with low MAE.

        Skill Level Some Python

        Data Status Help me find public data

        Data Description Daily wearable metrics such as HRV, sleep, steps, and workout intensity.

        Constraints Keep it beginner-friendly."""
    )

    assert payload["project_title"] == "Daily Recovery Score Estimator"
    assert payload["idea"] == "Train a machine learning model to predict a daily recovery score."
    assert payload["goal"] == "Predict a continuous score from 0 to 100 with low MAE."
    assert payload["skill_level"] == "some_python"
    assert payload["data_status"] == "need_public_dataset"
    assert payload["data_description"].startswith("Daily wearable metrics")
    assert payload["constraints"] == "Keep it beginner-friendly."


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
                "debate_summary": "Agents agreed the dataset and model are compatible.",
                "next_steps": ["Pick a dataset", "Train a baseline"],
                "glossary": [{"term": "MAE", "definition": "Average absolute prediction error."}],
                "kaggle_datasets": [{"rank": 1, "title": "PlantVillage", "url": "https://www.kaggle.com/x"}],
                "huggingface_models": [{"rank": 1, "model_id": "google/vit-base", "url": "https://huggingface.co/google/vit-base"}],
                "compatibility_result": {
                    "chosen_dataset": "PlantVillage",
                    "chosen_dataset_url": "https://www.kaggle.com/x",
                    "chosen_model": "google/vit-base",
                    "chosen_model_url": "https://huggingface.co/google/vit-base",
                    "compatibility_score": "High",
                    "why_this_pair": "Both are image-classification friendly.",
                    "estimated_effort": "half a day",
                    "preprocessing_dimensions": [
                        {
                            "dimension": "Format Alignment",
                            "status": "Minor Prep",
                            "description": "Resize images before fine-tuning.",
                            "steps": ["Resize to model input size", "Normalize channels"],
                        }
                    ],
                },
            },
        }
    )

    assert "# Plant Disease Detector" in response
    assert "Recommended Dataset + Model Pair" in response
    assert "Preprocessing roadmap" in response
    assert "Agent Debate Summary" in response
    assert "Training Loop Blueprint" in response
    assert "for epoch in range(num_epochs)" in response
    assert "Build Checklist" in response
    assert "Prototype And Deploy From The Web App" in response
    assert "PlantVillage" in response
    assert "google/vit-base" in response
