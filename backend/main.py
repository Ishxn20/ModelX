from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from config import settings
from api.routes import router
from api.training_simulation import router as training_simulation_router
from api.inference import router as inference_router
from api.ship import router as ship_router
from api.gemma import router as gemma_router
from api.sse import sse_manager
from api.sse_test import create_test_sse_endpoint
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

app = FastAPI(
    title="ModelX API",
    description="Guided multi-agent ML project planning for beginners",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")
app.include_router(training_simulation_router)
app.include_router(inference_router)
app.include_router(ship_router)
app.include_router(gemma_router)


@app.options("/api/inference/chat")
async def inference_options(request: Request):
    from fastapi.responses import Response
    origin = request.headers.get("origin", "*")
    return Response(
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": origin if origin else "*",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        }
    )


@app.options("/api/sse/{session_id}")
async def sse_options(session_id: str, request: Request):
    from fastapi.responses import Response
    origin = request.headers.get("origin", "*")
    return Response(
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": origin if origin else "*",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Cache-Control",
        }
    )


@app.get("/api/sse/{session_id}")
async def sse_endpoint(session_id: str, request: Request):
    logger.info(f"SSE connection requested for session: {session_id}")
    origin = request.headers.get("origin", "*")
    event_generator = sse_manager.stream_events(session_id, request)
    response = StreamingResponse(
        event_generator,
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
            "Access-Control-Allow-Origin": origin if origin else "*",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Headers": "Cache-Control, Last-Event-ID",
        }
    )
    return response


@app.get("/api/sse/test/{session_id}")
async def sse_test_endpoint(session_id: str, request: Request):
    logger.info(f"Test SSE connection requested for session: {session_id}")
    return create_test_sse_endpoint(session_id, request)


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "modelx"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.backend_host,
        port=settings.backend_port,
        reload=True
    )
