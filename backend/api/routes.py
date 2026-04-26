import logging
from typing import Literal, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.crew_orchestrator import ModelXPlannerOrchestrator

logger = logging.getLogger(__name__)

router = APIRouter()

orchestrator = ModelXPlannerOrchestrator()


class PlanRequest(BaseModel):
    project_title: Optional[str] = None
    idea: str
    goal: str
    skill_level: Literal["beginner", "some_python", "intermediate"]
    data_status: Literal["no_dataset", "have_dataset", "need_public_dataset"]
    data_description: Optional[str] = None
    constraints: Optional[str] = None


class PlanResponse(BaseModel):
    status: str
    session_id: str
    message: str


@router.options("/plan")
async def plan_options():
    return {}


@router.post("/plan", response_model=PlanResponse)
async def start_plan(request: PlanRequest):
    try:
        logger.info("Starting ModelX plan for idea: %s", request.idea[:120])
        session_id = await orchestrator.start_plan(request.model_dump())

        return PlanResponse(
            status="started",
            session_id=session_id,
            message=f"ModelX planning started. Connect to /api/sse/{session_id} for real-time updates.",
        )
    except Exception as exc:
        logger.error("Failed to start ModelX plan: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to start plan: {str(exc)}")


@router.get("/plan/{session_id}")
async def get_plan_status(session_id: str):
    try:
        result = await orchestrator.get_result(session_id)
        if result is None:
            raise HTTPException(status_code=404, detail=f"Session {session_id} not found")
        return result
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Error getting ModelX plan status: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "modelx-planner",
        "active_sessions": orchestrator.get_session_count(),
    }
