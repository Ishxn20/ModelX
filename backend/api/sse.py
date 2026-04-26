from fastapi import Request
from fastapi.responses import StreamingResponse
from typing import Dict, Any
import json
import asyncio
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

PING_INTERVAL = 30
QUEUE_TIMEOUT = 1.0


class SSEManager:
    def __init__(self):
        self.session_queues: Dict[str, list] = {}

    async def subscribe(self, session_id: str) -> asyncio.Queue:
        if session_id not in self.session_queues:
            self.session_queues[session_id] = []

        queue = asyncio.Queue()
        self.session_queues[session_id].append(queue)

        logger.info(f"SSE subscribed for session {session_id}. Total clients: {len(self.session_queues[session_id])}")
        return queue

    async def unsubscribe(self, session_id: str, queue: asyncio.Queue):
        if session_id in self.session_queues:
            try:
                self.session_queues[session_id].remove(queue)
                logger.info(f"SSE unsubscribed for session {session_id}. Remaining clients: {len(self.session_queues[session_id])}")

                if not self.session_queues[session_id]:
                    del self.session_queues[session_id]
                    logger.info(f"Session {session_id} has no more clients. Removed.")
            except ValueError:
                pass

    async def broadcast(self, session_id: str, event_type: str, data: Dict[str, Any]):
        if session_id not in self.session_queues:
            logger.warning(f"No SSE clients for session {session_id}")
            return

        message = {
            "type": event_type,
            "data": data
        }

        for queue in self.session_queues[session_id]:
            try:
                await queue.put(message)
            except Exception as e:
                logger.error(f"Error broadcasting to queue: {e}")

    async def send_phase_change(self, session_id: str, phase: str):
        await self.broadcast(session_id, "phase_change", {
            "phase": phase,
            "timestamp": datetime.now().isoformat()
        })

    async def send_agent_message(
        self,
        session_id: str,
        agent: str,
        message: str,
        message_type: str = "info"
    ):
        await self.broadcast(session_id, "agent_message", {
            "agent": agent,
            "message": message,
            "message_type": message_type,
            "timestamp": int(datetime.now().timestamp() * 1000)
        })

    async def send_blueprint(self, session_id: str, blueprint: Dict[str, Any]):
        await self.broadcast(session_id, "blueprint", blueprint)

    async def send_error(self, session_id: str, error_message: str, error_code: str = "ERROR"):
        await self.broadcast(session_id, "error", {
            "message": error_message,
            "code": error_code,
            "timestamp": datetime.now().isoformat()
        })

    async def send_ping(self, session_id: str):
        await self.broadcast(session_id, "ping", {})

    def stream_events(self, session_id: str, request: Request):
        async def event_generator():
            queue = await self.subscribe(session_id)

            try:
                yield f"data: {json.dumps({'type': 'connected', 'data': {'session_id': session_id}})}\n\n"

                last_ping = datetime.now()

                while True:
                    if await request.is_disconnected():
                        logger.info(f"SSE client disconnected for session {session_id}")
                        break

                    now = datetime.now()
                    if (now - last_ping).total_seconds() >= PING_INTERVAL:
                        yield f"data: {json.dumps({'type': 'ping', 'data': {}})}\n\n"
                        last_ping = now

                    try:
                        message = await asyncio.wait_for(queue.get(), timeout=QUEUE_TIMEOUT)
                        yield f"data: {json.dumps(message)}\n\n"
                    except asyncio.TimeoutError:
                        continue

            except asyncio.CancelledError:
                logger.info(f"SSE stream cancelled for session {session_id}")
            except Exception as e:
                logger.error(f"SSE stream error for session {session_id}: {e}")
                yield f"data: {json.dumps({'type': 'error', 'data': {'message': str(e)}})}\n\n"
            finally:
                await self.unsubscribe(session_id, queue)

        return event_generator()


sse_manager = SSEManager()
