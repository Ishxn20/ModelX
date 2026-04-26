"""
Mock SSE endpoint for testing ModelX frontend SSE integration.
"""

import asyncio
import json
import logging
from datetime import datetime

from fastapi import Request
from fastapi.responses import StreamingResponse

logger = logging.getLogger(__name__)


async def generate_mock_events(session_id: str, request: Request):
    """Generate mock ModelX SSE events."""
    yield f"data: {json.dumps({'type': 'connected', 'data': {'session_id': session_id}})}\n\n"
    await asyncio.sleep(0.1)

    workflow = [
        (
            "idea",
            "system",
            ["ModelX is reading your idea and preparing the guided planning workflow."],
        ),
        (
            "dataset",
            "Dataset Agent",
            [
                "A training example should be one clear plant leaf photo plus one disease label.",
                "A public plant disease dataset is enough for a first prototype if the labels are narrowed.",
                "The main risks are blurry photos, duplicate images, and labels that do not match the user's goal.",
            ],
        ),
        (
            "model",
            "Model Agent",
            [
                "This is an image classification task.",
                "Start with a pretrained image classifier as the baseline.",
                "A stretch version can compare two pretrained image models after the baseline works.",
            ],
        ),
        (
            "training",
            "Training Agent",
            [
                "Resize images, normalize pixels, and split data before training.",
                "Use train, validation, and test sets so progress is measured on examples the model has not trained on.",
                "Watch for overfitting if training accuracy improves while validation accuracy stalls.",
            ],
        ),
        (
            "evaluation",
            "Evaluation Agent",
            [
                "Use accuracy for the overall score and per-class recall for each disease label.",
                "Manually test bright, dim, messy, and healthy leaf photos.",
                "The first version should say when it is unsure or out of scope.",
            ],
        ),
        (
            "blueprint",
            "ModelX Guide",
            ["Synthesizing the specialist discussion into the final ML Blueprint."],
        ),
    ]

    for phase, agent, messages in workflow:
        if await request.is_disconnected():
            return

        yield f"data: {json.dumps({'type': 'phase_change', 'data': {'phase': phase, 'timestamp': datetime.now().isoformat()}})}\n\n"
        await asyncio.sleep(0.2)

        for message in messages:
            if await request.is_disconnected():
                return
            event_data = {
                "type": "agent_message",
                "data": {
                    "agent": agent,
                    "message": message,
                    "message_type": "info",
                    "timestamp": int(datetime.now().timestamp() * 1000),
                },
            }
            yield f"data: {json.dumps(event_data)}\n\n"
            await asyncio.sleep(0.4)

    blueprint = {
        "recommendation": "START_SIMPLE",
        "summary": "Start with a small plant leaf image classifier.",
        "problem_framing": "Classify clear leaf photos into a few disease labels. Do not treat it as a complete diagnosis tool.",
        "dataset_plan": "Use a public labeled leaf image dataset, narrow the labels, inspect examples, and remove duplicates.",
        "model_plan": "Use image classification with a pretrained baseline model and compare a stretch model later.",
        "training_plan": "Resize images, split data, train a short baseline, and monitor validation performance.",
        "evaluation_plan": "Track accuracy, per-class recall, manual examples, and low-confidence cases.",
        "debate_summary": "Agents agreed this is a good beginner project if data labels are narrowed and claims stay modest.",
        "next_steps": [
            "Pick 3 to 5 plant conditions.",
            "Find and inspect a public labeled image dataset.",
            "Create train, validation, and test splits.",
            "Train a simple pretrained image classifier.",
        ],
        "glossary": [
            {"term": "Label", "definition": "The answer for one training example."},
            {"term": "Overfitting", "definition": "When the model memorizes training examples."},
        ],
    }

    yield f"data: {json.dumps({'type': 'blueprint', 'data': blueprint})}\n\n"
    await asyncio.sleep(0.5)
    yield f"data: {json.dumps({'type': 'phase_change', 'data': {'phase': 'completed', 'timestamp': datetime.now().isoformat()}})}\n\n"


def create_test_sse_endpoint(session_id: str, request: Request):
    """Create an SSE test endpoint that generates mock ModelX events."""
    origin = request.headers.get("origin", "*")

    return StreamingResponse(
        generate_mock_events(session_id, request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
            "Access-Control-Allow-Origin": origin if origin else "*",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Headers": "Cache-Control",
        },
    )
