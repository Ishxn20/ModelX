from crewai import Agent

from agents.prompts import (
    COMPATIBILITY_AGENT_PROMPT,
    DATASET_AGENT_PROMPT,
    EVALUATION_AGENT_PROMPT,
    HUGGINGFACE_AGENT_PROMPT,
    KAGGLE_AGENT_PROMPT,
    MODEL_AGENT_PROMPT,
    MODELX_GUIDE_PROMPT,
    TRAINING_AGENT_PROMPT,
)
from tools.kaggle_tool import KaggleTool
from tools.huggingface_tool import HuggingFaceTool

DEFAULT_MAX_ITER = 4
SEARCH_MAX_ITER = 6


def create_dataset_agent() -> Agent:
    return Agent(
        role="Dataset Agent",
        goal="Clarify data needs, label strategy, public dataset options, and data risks for a beginner ML project",
        backstory=DATASET_AGENT_PROMPT,
        tools=[],
        verbose=True,
        allow_delegation=False,
        max_iter=DEFAULT_MAX_ITER,
    )


def create_model_agent() -> Agent:
    return Agent(
        role="Model Agent",
        goal="Choose a beginner-friendly ML task framing, baseline model, and stretch model",
        backstory=MODEL_AGENT_PROMPT,
        tools=[],
        verbose=True,
        allow_delegation=False,
        max_iter=DEFAULT_MAX_ITER,
    )


def create_kaggle_agent() -> Agent:
    return Agent(
        role="Kaggle Agent",
        goal="Find the top 5 most relevant public datasets on Kaggle for the project",
        backstory=KAGGLE_AGENT_PROMPT,
        tools=[KaggleTool()],
        verbose=True,
        allow_delegation=False,
        max_iter=SEARCH_MAX_ITER,
    )


def create_huggingface_agent() -> Agent:
    return Agent(
        role="HuggingFace Agent",
        goal="Find the top 5 most relevant pre-trained models on HuggingFace for the project",
        backstory=HUGGINGFACE_AGENT_PROMPT,
        tools=[HuggingFaceTool()],
        verbose=True,
        allow_delegation=False,
        max_iter=SEARCH_MAX_ITER,
    )


def create_compatibility_agent() -> Agent:
    return Agent(
        role="Compatibility Agent",
        goal="Pick the best dataset+model pair and produce a 5-dimension preprocessing roadmap",
        backstory=COMPATIBILITY_AGENT_PROMPT,
        tools=[],
        verbose=True,
        allow_delegation=False,
        max_iter=DEFAULT_MAX_ITER,
    )


def create_training_agent() -> Agent:
    return Agent(
        role="Training Agent",
        goal="Design a practical training recipe with preprocessing, splits, and overfitting checks",
        backstory=TRAINING_AGENT_PROMPT,
        tools=[],
        verbose=True,
        allow_delegation=False,
        max_iter=DEFAULT_MAX_ITER,
    )


def create_evaluation_agent() -> Agent:
    return Agent(
        role="Evaluation Agent",
        goal="Define metrics, test cases, acceptance criteria, and failure-mode checks",
        backstory=EVALUATION_AGENT_PROMPT,
        tools=[],
        verbose=True,
        allow_delegation=False,
        max_iter=DEFAULT_MAX_ITER,
    )


def create_modelx_guide() -> Agent:
    return Agent(
        role="ModelX Guide",
        goal="Synthesize specialist reasoning into a beginner-friendly ML Blueprint",
        backstory=MODELX_GUIDE_PROMPT,
        tools=[],
        verbose=True,
        allow_delegation=False,
        max_iter=3,
    )


def create_all_agents() -> dict:
    return {
        "dataset_agent": create_dataset_agent(),
        "kaggle_agent": create_kaggle_agent(),
        "model_agent": create_model_agent(),
        "huggingface_agent": create_huggingface_agent(),
        "compatibility_agent": create_compatibility_agent(),
        "training_agent": create_training_agent(),
        "evaluation_agent": create_evaluation_agent(),
        "modelx_guide": create_modelx_guide(),
    }
