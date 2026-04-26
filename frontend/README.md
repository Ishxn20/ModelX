# ModelX Frontend

React + TypeScript + Vite frontend for the ModelX guided ML planner.

## Scripts

```bash
npm ci
npm run dev
npm run build
npm run lint
```

## Runtime Modes

- Default: local simulation mode for frontend-only development.
- Live backend: set `VITE_USE_SSE=true` and optionally `VITE_API_URL=http://localhost:8000`.

## Main Flow

1. Project intake form collects idea, goal, skill level, data status, data description, and constraints.
2. Live agent view streams Dataset, Model, Training, Evaluation, and ModelX Guide updates.
3. Final ML Blueprint renders the recommendation, plans, debate summary, next steps, and glossary.
