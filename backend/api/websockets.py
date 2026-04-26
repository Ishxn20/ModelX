from fastapi import WebSocket
from typing import List, Dict, Any
import json
import logging

logger = logging.getLogger(__name__)

class WebSocketManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket connected. Total: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        logger.info(f"WebSocket disconnected. Total: {len(self.active_connections)}")

    async def broadcast(self, event_type: str, data: Dict[str, Any]):
        pass

    async def send_phase_change(self, phase: str):
        await self.broadcast("phase_change", {"phase": phase})

    async def send_agent_message(self, agent: str, message: str, message_type: str = "info"):
        await self.broadcast("agent_message", {
            "agent": agent,
            "message": message,
            "message_type": message_type
        })

    async def send_decision(self, decision: Dict[str, Any]):
        await self.broadcast("decision", decision)

    async def send_error(self, error_message: str):
        await self.broadcast("error", {"message": error_message})

websocket_manager = WebSocketManager()
