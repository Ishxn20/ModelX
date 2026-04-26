import pytest
from pydantic import ValidationError

from api.routes import PlanRequest


def test_plan_request_accepts_modelx_payload():
    request = PlanRequest(
        project_title="Rent Predictor",
        idea="Predict apartment rent from listing details.",
        goal="Estimate a fair monthly rent for a new listing.",
        skill_level="some_python",
        data_status="have_dataset",
        data_description="Rows with bedrooms, neighborhood, size, and rent.",
        constraints="Beginner-friendly tabular model.",
    )

    assert request.idea.startswith("Predict apartment")
    assert request.skill_level == "some_python"


def test_plan_request_rejects_unknown_skill_level():
    with pytest.raises(ValidationError):
        PlanRequest(
            idea="Predict rent.",
            goal="Estimate rent.",
            skill_level="expert",
            data_status="have_dataset",
        )


def test_plan_request_rejects_unknown_data_status():
    with pytest.raises(ValidationError):
        PlanRequest(
            idea="Predict rent.",
            goal="Estimate rent.",
            skill_level="beginner",
            data_status="uploaded_file",
        )
