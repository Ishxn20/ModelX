from api.gemma import (
    BlueprintContext,
    GemmaChatMessage,
    GemmaChatRequest,
    ProjectContext,
    _build_system_prompt,
)


def test_gemma_system_prompt_includes_page_project_and_blueprint_context():
    req = GemmaChatRequest(
        messages=[GemmaChatMessage(role="user", content="What should I do next?")],
        current_view="plan",
        page_context="Training tab",
        project=ProjectContext(
            project_title="Traffic Sign Recognition",
            idea="Classify traffic signs from images.",
            goal="Build a beginner computer vision classifier.",
            skill_level="beginner",
            data_status="need_public_dataset",
        ),
        blueprint=BlueprintContext(
            recommendation="REFINE_IDEA",
            summary="Use a public traffic sign dataset first.",
            training_plan="Use 70/15/15 train, validation, and test splits.",
            evaluation_plan="Measure accuracy and inspect errors.",
            next_steps=["Download GTSRB", "Train a baseline"],
        ),
    )

    prompt = _build_system_prompt(req)

    assert "Training tab" in prompt
    assert "Traffic Sign Recognition" in prompt
    assert "Use 70/15/15" in prompt
    assert "Download GTSRB" in prompt
