# ModelX Architecture

ModelX keeps the original real-time multi-agent skeleton and retargets it to beginner ML planning.

## System Overview

```
React + TypeScript frontend
  -> POST /api/plan
  -> GET /api/sse/{session_id}

FastAPI backend
  -> ModelXPlannerOrchestrator
  -> CrewAI sequential workflow
  -> 5 ModelX agents
  -> final MLBlueprint JSON
```

## Workflow

1. Idea intake: the user describes the project goal, skill level, data status, and constraints.
2. Dataset task: the Dataset Agent creates the data and label plan.
3. Model task: the Model Agent chooses the task framing, baseline, and stretch model.
4. Training task: the Training Agent creates a beginner-friendly training recipe.
5. Evaluation task: the Evaluation Agent defines metrics, test cases, and failure modes.
6. Blueprint task: the ModelX Guide synthesizes all outputs into the final ML Blueprint.

## Data Flow

- `POST /api/plan` validates the `PlanRequest` and starts a background planning session.
- The orchestrator broadcasts `phase_change`, `agent_message`, and `blueprint` events through SSE.
- The frontend renders live agent reasoning, phase progress, and the final ML Blueprint.
- `GET /api/plan/{session_id}` returns stored session status, task outputs, errors, and final result.

## Output Contract

The final result is an `MLBlueprint`:

- `recommendation`: `START_SIMPLE`, `NEEDS_DATA`, or `REFINE_IDEA`
- `summary`
- `problem_framing`
- `dataset_plan`
- `model_plan`
- `training_plan`
- `evaluation_plan`
- `debate_summary`
- `next_steps`
- `glossary`

## Design Notes

- v1 is a planner only. It does not train models, upload datasets, or generate notebooks.
- Legacy external integrations are not part of the active ModelX flow.
- The frontend can run without the backend through a local simulation that follows the same phase names and blueprint shape.
