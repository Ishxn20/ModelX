#!/usr/bin/env python3
"""
End-to-end smoke script for the ModelX planning API.
"""

import asyncio
import json

import httpx


TEST_PROJECT = {
    "project_title": "Plant Disease Helper",
    "idea": "Classify plant leaf photos by disease.",
    "goal": "Help beginner gardeners decide what to inspect next.",
    "skill_level": "beginner",
    "data_status": "need_public_dataset",
    "data_description": "Leaf images with labels like healthy, rust, and powdery mildew.",
    "constraints": "Keep the first version small enough for a school project.",
}

BASE_URL = "http://localhost:8000"


async def run_full_plan():
    async with httpx.AsyncClient(timeout=600.0) as client:
        response = await client.post(f"{BASE_URL}/api/plan", json=TEST_PROJECT)
        response.raise_for_status()
        session_id = response.json()["session_id"]
        print(f"Started ModelX plan: {session_id}")

        async with client.stream("GET", f"{BASE_URL}/api/sse/{session_id}") as sse_response:
            async for line in sse_response.aiter_lines():
                if not line.startswith("data: "):
                    continue
                event = json.loads(line[6:])
                print(event["type"], event.get("data", {}))
                if event.get("type") == "phase_change" and event.get("data", {}).get("phase") == "completed":
                    break

        result = await client.get(f"{BASE_URL}/api/plan/{session_id}")
        result.raise_for_status()
        print(json.dumps(result.json().get("result"), indent=2))


if __name__ == "__main__":
    asyncio.run(run_full_plan())
