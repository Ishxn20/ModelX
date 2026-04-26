from agents.definitions import create_all_agents
from tasks.decision_tasks import MLBlueprint, create_modelx_guide_task
from tasks.research_tasks import (
    create_compatibility_task,
    create_dataset_task,
    create_evaluation_task,
    create_huggingface_task,
    create_kaggle_task,
    create_model_task,
    create_training_task,
)


PROJECT_DATA = {
    "project_title": "Plant Disease Helper",
    "idea": "Classify plant leaf photos by disease.",
    "goal": "Help a beginner gardener identify common leaf problems.",
    "skill_level": "beginner",
    "data_status": "need_public_dataset",
    "data_description": "Leaf images with disease labels.",
    "constraints": "School project scope.",
}


def test_all_modelx_agents_created():
    agents = create_all_agents()

    assert list(agents.keys()) == [
        "dataset_agent",
        "kaggle_agent",
        "model_agent",
        "huggingface_agent",
        "compatibility_agent",
        "training_agent",
        "evaluation_agent",
        "modelx_guide",
    ]
    assert [agent.role for agent in agents.values()] == [
        "Dataset Agent",
        "Kaggle Agent",
        "Model Agent",
        "HuggingFace Agent",
        "Compatibility Agent",
        "Training Agent",
        "Evaluation Agent",
        "ModelX Guide",
    ]


def test_eight_task_orchestration_order_and_context():
    agents = create_all_agents()

    dataset_task = create_dataset_task(agents, PROJECT_DATA, context=[])
    kaggle_task = create_kaggle_task(agents, PROJECT_DATA, context=[dataset_task])
    model_task = create_model_task(agents, PROJECT_DATA, context=[dataset_task])
    huggingface_task = create_huggingface_task(agents, PROJECT_DATA, context=[model_task])
    compatibility_task = create_compatibility_task(
        agents,
        PROJECT_DATA,
        context=[dataset_task, kaggle_task, model_task, huggingface_task],
    )
    training_task = create_training_task(agents, PROJECT_DATA, context=[dataset_task, model_task])
    evaluation_task = create_evaluation_task(
        agents,
        PROJECT_DATA,
        context=[dataset_task, model_task, training_task],
    )
    guide_task = create_modelx_guide_task(
        agents,
        PROJECT_DATA,
        context=[dataset_task, model_task, training_task, evaluation_task],
    )

    tasks = [
        dataset_task,
        kaggle_task,
        model_task,
        huggingface_task,
        compatibility_task,
        training_task,
        evaluation_task,
        guide_task,
    ]

    assert [task.agent.role for task in tasks] == [
        "Dataset Agent",
        "Kaggle Agent",
        "Model Agent",
        "HuggingFace Agent",
        "Compatibility Agent",
        "Training Agent",
        "Evaluation Agent",
        "ModelX Guide",
    ]
    assert len(kaggle_task.context) == 1
    assert len(model_task.context) == 1
    assert len(huggingface_task.context) == 1
    assert len(compatibility_task.context) == 4
    assert len(training_task.context) == 2
    assert len(evaluation_task.context) == 3
    assert len(guide_task.context) == 4


def test_ml_blueprint_schema_accepts_expected_shape():
    blueprint = MLBlueprint(
        recommendation="START_SIMPLE",
        summary="Start with a small prototype.",
        problem_framing="Classify clear leaf images into a few labels.",
        dataset_plan="Use a public labeled leaf image dataset.",
        model_plan="Use a transfer-learning image classifier baseline.",
        training_plan="Resize images and train with a validation split.",
        evaluation_plan="Measure accuracy and per-class recall.",
        debate_summary="Agents agreed the main risk is data quality.",
        next_steps=["Pick labels", "Inspect dataset", "Train baseline"],
        glossary=[{"term": "Label", "definition": "The answer for one training example."}],
    )

    assert blueprint.recommendation == "START_SIMPLE"
    assert blueprint.glossary[0].term == "Label"
