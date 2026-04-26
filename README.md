# ModelX

![tag:innovationlab](https://img.shields.io/badge/innovationlab-3D8BD3)

ModelX is an educational multi-agent platform that helps beginners turn ML ideas into practical model plans through a guided visual workflow.

The app uses Agent Debate Mode with eight specialists:

- Dataset Agent: clarifies examples, labels, public data options, data quality, bias, and privacy risks.
- Kaggle Agent: searches for relevant public datasets on Kaggle.
- Model Agent: frames the ML task and recommends a simple baseline plus a stretch model.
- HuggingFace Agent: searches for useful HuggingFace models and starter pipelines.
- Compatibility Agent: checks whether the dataset, model choice, task type, and preprocessing needs fit together.
- Training Agent: explains preprocessing, train/validation/test splits, training steps, and overfitting checks.
- Evaluation Agent: defines metrics, manual tests, failure modes, and acceptance criteria.
- ModelX Guide: synthesizes the discussion into a beginner-friendly ML Blueprint.

## Tech Stack

- Frontend: React, TypeScript, Vite, Material UI
- Backend: FastAPI, CrewAI, Server-Sent Events
- Agentverse: Fetch.ai uAgents and Chat Protocol
- AI providers: configured through environment variables for the backend

## API

- `POST /api/plan`: start a ModelX planning session.
- `GET /api/plan/{session_id}`: fetch status and the final blueprint.
- `GET /api/sse/{session_id}`: stream live agent updates.
- `POST /api/inference/chat`: test an inference-style chat experience using the generated Blueprint context.

## Local Development

Frontend:

```bash
cd frontend
npm ci
npm run dev
```

Backend:

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

Set `VITE_USE_SSE=true` in the frontend environment when using the live backend. Without it, the frontend uses a built-in ModelX simulation.

## Fetch.ai Agentverse Track

ModelX includes a standalone ASI:One-compatible uAgent adapter for the Fetch.ai Agentverse sponsor track.

Agent:

- Name: `ModelX Blueprint Agent`
- Agentverse profile: TODO after registration
- Agent address: TODO after registration
- ASI:One shared chat: TODO after demo chat

What it demonstrates:

- Registers a ModelX-facing agent on Agentverse.
- Implements the Fetch.ai Chat Protocol for ASI:One interaction.
- Routes ASI:One user intent into the existing ModelX multi-agent planning backend.
- Returns a practical ML Blueprint with dataset, model, training, evaluation, and next-step recommendations.

Run the existing ModelX backend first:

```bash
cd backend
uvicorn main:app --reload
```

In a second terminal, run the Agentverse adapter:

```bash
cd backend
python -m fetch_agent.modelx_blueprint_agent
```

Recommended environment variables in `backend/.env`:

```bash
MODELX_AGENT_NAME=modelx-blueprint-agent
MODELX_AGENT_SEED=replace-with-a-stable-secret-seed
MODELX_AGENT_PORT=8001
MODELX_BACKEND_URL=http://127.0.0.1:8000
MODELX_AGENT_TIMEOUT=240
```

After the agent starts, use the Agentverse inspector/profile link printed in the terminal to complete registration, then test it from ASI:One with a prompt such as:

```text
Help me build a beginner ML model that detects plant disease from leaf images.
```

Submit the public GitHub repo, demo video, Agentverse profile URL, and ASI:One shared chat URL on Devpost.
