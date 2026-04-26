from typing import List, Literal, Optional

from crewai import Task
from pydantic import BaseModel, Field


class GlossaryEntry(BaseModel):
    term: str = Field(..., description="ML term")
    definition: str = Field(..., description="Short beginner-friendly definition")


class PreprocessingDimension(BaseModel):
    dimension: str = Field(..., description="Dimension name, e.g. 'Format Alignment'")
    status: str = Field(..., description="'Ready', 'Minor Prep', or 'Major Prep'")
    description: str = Field(..., description="What the issue or confirmation is")
    steps: List[str] = Field(..., description="Concrete beginner-friendly steps")


class CompatibilityResult(BaseModel):
    chosen_dataset: str = Field(..., description="Title of the chosen dataset")
    chosen_dataset_url: str = Field(..., description="URL of the chosen dataset")
    chosen_model: str = Field(..., description="model_id of the chosen HuggingFace model")
    chosen_model_url: str = Field(..., description="URL of the chosen model on HuggingFace")
    compatibility_score: str = Field(..., description="'High', 'Medium', or 'Low'")
    why_this_pair: str = Field(..., description="Beginner-friendly explanation of why this pair works")
    preprocessing_dimensions: List[PreprocessingDimension] = Field(
        ..., description="Exactly 5 preprocessing dimensions"
    )
    estimated_effort: str = Field(..., description="Beginner-friendly effort estimate for preprocessing")


class MLBlueprint(BaseModel):
    recommendation: Literal["START_SIMPLE", "NEEDS_DATA", "REFINE_IDEA"] = Field(
        ...,
        description="Recommended path for the first project version",
    )
    summary: str = Field(..., description="Short beginner-friendly overview")
    problem_framing: str = Field(..., description="What the model should and should not do")
    dataset_plan: str = Field(..., description="Dataset sources, labels, and recommended starting dataset")
    model_plan: str = Field(..., description="Task type, baseline model, stretch model, and rationale")
    training_plan: str = Field(..., description="Split strategy, training flow, and overfitting checks")
    evaluation_plan: str = Field(..., description="Metrics, test cases, acceptance criteria, and failure modes")
    debate_summary: str = Field(..., description="Where agents agreed or disagreed")
    next_steps: List[str] = Field(..., description="Concrete beginner next steps")
    glossary: List[GlossaryEntry] = Field(..., description="Beginner-friendly glossary")


def create_modelx_guide_task(agents: dict, project_data: dict, context: List[Task]) -> Task:
    project_title = project_data.get("project_title") or "Untitled ML idea"
    idea = project_data.get("idea", "")
    goal = project_data.get("goal", "")
    skill_level = project_data.get("skill_level", "beginner")
    data_status = project_data.get("data_status", "no_dataset")
    data_description = project_data.get("data_description") or "Not provided"
    constraints = project_data.get("constraints") or "None provided"

    description = f"""
    Create the final ModelX ML Blueprint for this beginner project.

    Project title: {project_title}
    Idea: {idea}
    Goal: {goal}
    Skill level: {skill_level}
    Data status: {data_status}
    Data description: {data_description}
    Constraints: {constraints}

    You can see all four specialist outputs in context:
    - Dataset Agent
    - Model Agent
    - Training Agent
    - Evaluation Agent

    Synthesize them into one beginner-friendly plan. Decide:
    - START_SIMPLE if the project can begin with a small prototype.
    - NEEDS_DATA if the main blocker is data collection, labeling, permission, or quality.
    - REFINE_IDEA if the idea is too broad, unclear, unsafe, or not yet a good ML problem.

    Return valid JSON only. Make every field specific to this project.
    """

    expected_output = """
    Valid structured output matching MLBlueprint:
    - recommendation
    - summary
    - problem_framing
    - dataset_plan
    - model_plan
    - training_plan
    - evaluation_plan
    - debate_summary
    - next_steps
    - glossary
    """

    return Task(
        description=description,
        expected_output=expected_output,
        agent=agents["modelx_guide"],
        context=context,
        output_pydantic=MLBlueprint,
    )
