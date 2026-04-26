import pytest

from api.sse import SSEManager


@pytest.mark.asyncio
async def test_sse_phase_and_blueprint_events():
    manager = SSEManager()
    queue = await manager.subscribe("session-1")

    try:
        await manager.send_phase_change("session-1", "dataset")
        phase_event = await queue.get()

        assert phase_event["type"] == "phase_change"
        assert phase_event["data"]["phase"] == "dataset"

        await manager.send_blueprint(
            "session-1",
            {
                "recommendation": "START_SIMPLE",
                "summary": "Start simple.",
                "problem_framing": "Classify examples.",
                "dataset_plan": "Use labeled data.",
                "model_plan": "Train a baseline.",
                "training_plan": "Split and train.",
                "evaluation_plan": "Measure accuracy.",
                "debate_summary": "Agents agreed.",
                "next_steps": ["Inspect data"],
                "glossary": [],
            },
        )
        blueprint_event = await queue.get()

        assert blueprint_event["type"] == "blueprint"
        assert blueprint_event["data"]["recommendation"] == "START_SIMPLE"
    finally:
        await manager.unsubscribe("session-1", queue)
