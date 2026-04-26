# ModelX

ModelX is an educational multi-agent platform that helps beginners turn ML ideas into practical model plans through a guided visual workflow.

The app uses Agent Debate Mode with five specialists:

- Dataset Agent: clarifies examples, labels, public data options, data quality, bias, and privacy risks.
- Model Agent: frames the ML task and recommends a simple baseline plus a stretch model.
- Training Agent: explains preprocessing, train/validation/test splits, training steps, and overfitting checks.
- Evaluation Agent: defines metrics, manual tests, failure modes, and acceptance criteria.
- ModelX Guide: synthesizes the discussion into a beginner-friendly ML Blueprint.

## Tech Stack

- Frontend: React, TypeScript, Vite, Material UI
- Backend: FastAPI, CrewAI, Server-Sent Events
- AI providers: configured through environment variables for the backend

## API

- `POST /api/plan`: start a ModelX planning session.
- `GET /api/plan/{session_id}`: fetch status and the final blueprint.
- `GET /api/sse/{session_id}`: stream live agent updates.

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
