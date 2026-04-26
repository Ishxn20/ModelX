from typing import List

from crewai import Task


def _project_context(project_data: dict) -> str:
    project_title = project_data.get("project_title") or "Untitled ML idea"
    idea = project_data.get("idea", "")
    goal = project_data.get("goal", "")
    skill_level = project_data.get("skill_level", "beginner")
    data_status = project_data.get("data_status", "no_dataset")
    data_description = project_data.get("data_description") or "Not provided"
    constraints = project_data.get("constraints") or "None provided"

    return f"""
    Project title: {project_title}
    Idea: {idea}
    Goal: {goal}
    Skill level: {skill_level}
    Data status: {data_status}
    Data description: {data_description}
    Constraints: {constraints}
    """


def create_dataset_task(agents: dict, project_data: dict, context: List[Task]) -> Task:
    description = f"""
    Review this beginner ML project idea and create the data plan.

    {_project_context(project_data)}

    Focus on:
    1. What each training example should look like (one concrete example).
    2. What label or target the project needs and how it should be structured.
    3. Whether the user's current data status is enough for a first prototype.
    4. What kind of public dataset would work best and where to look.

    Keep the explanation beginner-friendly and specific to the idea.
    Do NOT cover preprocessing steps, data cleaning, or quality checks — those are handled separately.
    """

    expected_output = """
    Markdown report with sections:
    - Data Needed
    - Labels or Targets
    - First Dataset Recommendation
    - Data Readiness Verdict
    """

    return Task(
        description=description,
        expected_output=expected_output,
        agent=agents["dataset_agent"],
        context=context,
    )


def create_kaggle_task(agents: dict, project_data: dict, context: List[Task]) -> Task:
    description = f"""
    Find the top 5 most relevant public datasets on Kaggle for this ML project.

    {_project_context(project_data)}

    The Dataset Agent's full analysis is in your context — use it to understand:
    - The domain and topic area of the project
    - The required data type (images, tabular, text, audio, etc.)
    - The ML task type (classification, regression, detection, etc.)
    - What the labels or targets should look like

    Your steps:
    1. From the project context and Dataset Agent analysis, create 3 specific search queries.
       Each query must combine the domain + data type + task type.
       Example for a plant disease project: "plant disease leaf images classification",
       "plant leaf dataset labeled disease", "agriculture crop disease recognition dataset"
    2. Run the KaggleDatasetSearch tool for each query.
    3. Combine all results, remove duplicates, and filter out clearly irrelevant datasets.
    4. Rank the top 5 most relevant datasets from best to least. Apply this priority:
       a. Does the dataset directly match the ML problem (same task, same domain)?
       b. Does it have clean labels matching the project target?
       c. Is it well-rated (usability_rating, vote_count)?
       d. Is the size appropriate for a beginner (not too large, not trivially small)?
    5. For each selected dataset, write one specific relevance_reason explaining exactly
       why it suits THIS project (reference the idea or domain, not generic praise).

    Return ONLY valid JSON with no markdown fences:
    {{
      "datasets": [
        {{
          "rank": 1,
          "title": "Exact dataset title from Kaggle",
          "url": "https://www.kaggle.com/datasets/...",
          "description": "What this dataset contains",
          "relevance_reason": "Specific reason why this fits THIS project",
          "vote_count": 123,
          "download_count": 4567
        }}
      ]
    }}

    If no relevant datasets are found or search fails, return:
    {{"datasets": [], "note": "reason"}}
    """

    expected_output = """
    Valid JSON with a "datasets" array of up to 5 ranked Kaggle datasets,
    each with rank, title, url, description, relevance_reason, vote_count, download_count.
    """

    return Task(
        description=description,
        expected_output=expected_output,
        agent=agents["kaggle_agent"],
        context=context,
    )


def create_huggingface_task(agents: dict, project_data: dict, context: List[Task]) -> Task:
    description = f"""
    Find the top 5 most relevant pre-trained models on HuggingFace Hub for this ML project.

    {_project_context(project_data)}

    The Model Agent's full analysis is in your context — use it to understand:
    - The exact ML task type (classification, regression, detection, etc.)
    - The recommended baseline model architecture
    - The data modality (vision, text, audio, tabular)
    - The specific domain

    Your steps:
    1. Identify the correct HuggingFace pipeline_tag from the Model Agent's task type.
    2. Run three searches with the HuggingFaceModelSearch tool:
       - Search 1: domain-specific query (e.g., "traffic sign classification fine-tuned")
       - Search 2: architecture query (e.g., "resnet image classification" or "efficientnet image classification")
       - Search 3: broad task query using only the pipeline_tag filter with a general term (e.g., "image classification pretrained")
    3. Combine all results, remove exact duplicates.
    4. Rank the top 5. Apply this priority order:
       a. Fine-tuned on the same or very similar domain (highest priority)
       b. Popular well-documented architectures (ResNet, EfficientNet, ViT, MobileNet, BERT, DistilBERT)
          that a beginner can easily fine-tune on this task
       c. High download count and likes

    CRITICAL RULE: You MUST return exactly 5 models. If domain-specific models are scarce,
    fill remaining slots with widely-used general-purpose models from the search results such as
    microsoft/resnet-50, google/efficientnet-b4, google/vit-base-patch16-224, or
    facebook/convnext-tiny-224. These are excellent starting points for fine-tuning and are
    highly relevant for any {_project_context(project_data)} task.
    Do NOT return an empty list — a general model the user can fine-tune is always better than nothing.

    6. For each model write a specific relevance_reason that explains:
       - Why this architecture suits the task (e.g., "ResNet-50 is ideal for image classification fine-tuning with small datasets")
       - OR why the fine-tuned version is directly useful

    Return ONLY valid JSON with no markdown fences:
    {{
      "models": [
        {{
          "rank": 1,
          "model_id": "owner/model-name",
          "url": "https://huggingface.co/owner/model-name",
          "task_type": "image-classification",
          "relevance_reason": "Specific reason why this fits THIS project",
          "downloads": 123456,
          "likes": 89
        }}
      ]
    }}
    """

    expected_output = """
    Valid JSON with a "models" array of up to 5 ranked HuggingFace models,
    each with rank, model_id, url, task_type, relevance_reason, downloads, likes.
    """

    return Task(
        description=description,
        expected_output=expected_output,
        agent=agents["huggingface_agent"],
        context=context,
    )


def create_compatibility_task(agents: dict, project_data: dict, context: List[Task]) -> Task:
    description = f"""
    Pick the single best dataset+model pair for this beginner ML project and produce a preprocessing roadmap.

    {_project_context(project_data)}

    You have full context from:
    - The Kaggle Agent: a ranked list of up to 5 relevant datasets
    - The HuggingFace Agent: a ranked list of up to 5 relevant models
    - The Dataset Agent: data requirements and label strategy
    - The Model Agent: task type and recommended model approach

    Your steps:
    1. Select the best dataset from the Kaggle list (rank 1 by default; choose differently only if
       a lower-ranked dataset is clearly more compatible with the top-ranked model).
    2. Select the best model from the HuggingFace list (rank 1 by default; choose differently only
       if a lower-ranked model is clearly more compatible with the chosen dataset).
    3. Evaluate the pair across exactly these 5 dimensions:
       a. Format Alignment — does the dataset's file format and structure match what the model expects?
       b. Size and Scale — is the dataset large enough, and how should inputs be resized or normalized?
       c. Label and Target Alignment — do the dataset's labels map to what the model output expects?
       d. Feature Engineering — what transformations, augmentations, or encodings are needed?
       e. Risks and Tradeoffs — what can go wrong with this specific pair?
    4. For each dimension, set a status: "Ready", "Minor Prep", or "Major Prep".
    5. For each dimension, list 2-4 concrete, beginner-friendly action steps.
    6. Assign an overall compatibility_score: "High", "Medium", or "Low".
    7. Write a 2-3 sentence why_this_pair explanation a beginner can understand.
    8. Give an estimated_effort string (e.g., "~2 hours of setup", "half a day of data prep").

    Return ONLY valid JSON with no markdown fences:
    {{
      "chosen_dataset": "Exact dataset title",
      "chosen_dataset_url": "https://www.kaggle.com/...",
      "chosen_model": "owner/model-name",
      "chosen_model_url": "https://huggingface.co/owner/model-name",
      "compatibility_score": "High | Medium | Low",
      "why_this_pair": "Beginner-friendly explanation",
      "preprocessing_dimensions": [
        {{
          "dimension": "Format Alignment",
          "status": "Ready | Minor Prep | Major Prep",
          "description": "What the situation is",
          "steps": ["step 1", "step 2"]
        }}
      ],
      "estimated_effort": "~2 hours of setup"
    }}
    """

    expected_output = """
    Valid JSON with chosen_dataset, chosen_dataset_url, chosen_model, chosen_model_url,
    compatibility_score, why_this_pair, preprocessing_dimensions (exactly 5), and estimated_effort.
    """

    return Task(
        description=description,
        expected_output=expected_output,
        agent=agents["compatibility_agent"],
        context=context,
    )


def create_model_task(agents: dict, project_data: dict, context: List[Task]) -> Task:
    description = f"""
    Choose the model approach for this beginner ML project.

    {_project_context(project_data)}

    You can see the Dataset Agent's plan in context. Use it to decide:
    1. The ML task type: classification, regression, clustering, recommendation, generation, or not-yet-ML.
    2. A simple baseline model the learner should try first.
    3. One stretch model to consider after the baseline works.
    4. Why this model choice fits the data and goal.
    5. Where a simpler rule-based solution should be tried before ML.

    Keep the explanation beginner-friendly and avoid advanced architecture details unless needed.
    """

    expected_output = """
    Markdown report with sections:
    - Task Type
    - Recommended Baseline
    - Stretch Model
    - Why This Fits
    - Beginner Explanation
    - Main Model Risks
    """

    return Task(
        description=description,
        expected_output=expected_output,
        agent=agents["model_agent"],
        context=context,
    )


def create_training_task(agents: dict, project_data: dict, context: List[Task]) -> Task:
    description = f"""
    Create a practical training recipe for this beginner ML project.

    {_project_context(project_data)}

    You can see the Dataset Agent and Model Agent outputs in context. Explain:
    1. Basic preprocessing needed before training.
    2. How to split data into training, validation, and test sets.
    3. A simple training sequence for the baseline model.
    4. How the beginner can tell whether training is improving.
    5. Overfitting checks and what to do if the model memorizes the data.

    Do not generate code. Focus on the workflow and learning checkpoints.
    """

    expected_output = """
    Markdown report with sections:
    - Preprocessing
    - Split Strategy
    - Training Steps
    - Progress Checks
    - Overfitting Warnings
    - Practical Training Notes
    """

    return Task(
        description=description,
        expected_output=expected_output,
        agent=agents["training_agent"],
        context=context,
    )


def create_evaluation_task(agents: dict, project_data: dict, context: List[Task]) -> Task:
    description = f"""
    Create the evaluation plan for this beginner ML project.

    {_project_context(project_data)}

    You can see the Dataset, Model, and Training outputs in context. Explain:
    1. The metrics that match the user's goal.
    2. What each metric means in plain language.
    3. Manual test cases the beginner can inspect by hand.
    4. Failure modes and examples where the model should not be trusted.
    5. Acceptance criteria for a first prototype.

    Keep the plan practical and beginner-friendly.
    """

    expected_output = """
    Markdown report with sections:
    - Recommended Metrics
    - Manual Test Cases
    - Failure Modes
    - Acceptance Criteria
    - Evaluation Summary
    """

    return Task(
        description=description,
        expected_output=expected_output,
        agent=agents["evaluation_agent"],
        context=context,
    )
