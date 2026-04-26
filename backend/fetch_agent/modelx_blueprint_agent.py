from __future__ import annotations

import asyncio
import logging
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import List
from uuid import uuid4

from dotenv import load_dotenv
from uagents import Agent, Context, Protocol
from uagents_core.contrib.protocols.chat import (
    ChatAcknowledgement,
    ChatMessage,
    EndSessionContent,
    StartSessionContent,
    TextContent,
    chat_protocol_spec,
)

try:
    from fetch_agent.modelx_client import (
        ModelXAgentError,
        ModelXBackendClient,
        ModelXClientConfig,
        format_blueprint_response,
    )
except ImportError:  # Allows `python modelx_blueprint_agent.py` from this directory.
    from modelx_client import (  # type: ignore
        ModelXAgentError,
        ModelXBackendClient,
        ModelXClientConfig,
        format_blueprint_response,
    )


load_dotenv(Path(__file__).resolve().parents[1] / ".env")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("modelx-agentverse")

AGENT_NAME = os.getenv("MODELX_AGENT_NAME", "modelx-blueprint-agent")
AGENT_SEED = os.getenv("MODELX_AGENT_SEED")
AGENT_PORT = int(os.getenv("MODELX_AGENT_PORT", "8001"))
BACKEND_URL = os.getenv("MODELX_BACKEND_URL", "http://127.0.0.1:8000")
POLL_INTERVAL_SECONDS = float(os.getenv("MODELX_AGENT_POLL_INTERVAL", "2"))
TIMEOUT_SECONDS = float(os.getenv("MODELX_AGENT_TIMEOUT", "240"))


agent_kwargs = {
    "name": AGENT_NAME,
    "port": AGENT_PORT,
    "mailbox": True,
    "publish_agent_details": True,
}
if AGENT_SEED:
    agent_kwargs["seed"] = AGENT_SEED
else:
    logger.warning("MODELX_AGENT_SEED is not set. The agent address may not be stable across restarts.")

agent = Agent(**agent_kwargs)
chat_proto = Protocol(spec=chat_protocol_spec)
modelx_client = ModelXBackendClient(
    ModelXClientConfig(
        backend_url=BACKEND_URL,
        poll_interval_seconds=POLL_INTERVAL_SECONDS,
        timeout_seconds=TIMEOUT_SECONDS,
    )
)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _extract_text(msg: ChatMessage) -> str:
    chunks: List[str] = []
    for item in msg.content:
        if isinstance(item, TextContent):
            chunks.append(item.text)
        elif isinstance(item, StartSessionContent):
            continue
    return "\n".join(chunk for chunk in chunks if chunk).strip()


def _chat_message(text: str, end_session: bool = True) -> ChatMessage:
    content = [TextContent(type="text", text=text)]
    if end_session:
        content.append(EndSessionContent(type="end-session"))
    return ChatMessage(timestamp=_utcnow(), msg_id=uuid4(), content=content)


@chat_proto.on_message(ChatMessage)
async def handle_chat_message(ctx: Context, sender: str, msg: ChatMessage):
    await ctx.send(
        sender,
        ChatAcknowledgement(timestamp=_utcnow(), acknowledged_msg_id=msg.msg_id),
    )

    user_text = _extract_text(msg)
    if not user_text:
        await ctx.send(
            sender,
            _chat_message("Tell me the ML idea you want to build, and I will turn it into a ModelX blueprint."),
        )
        return

    ctx.logger.info("Received ASI:One request from %s: %s", sender, user_text[:200])

    await ctx.send(
        sender,
        _chat_message(
            "ModelX received your idea and is building the ML Blueprint now. "
            "This can take a minute because multiple specialist agents are checking datasets, models, training, and evaluation.",
            end_session=False,
        ),
    )

    task = asyncio.create_task(_send_blueprint_when_ready(ctx, sender, user_text))
    task.add_done_callback(lambda done: _log_background_error(ctx, done))


async def _send_blueprint_when_ready(ctx: Context, sender: str, user_text: str):
    try:
        plan_status = await modelx_client.create_blueprint(user_text)
        response = format_blueprint_response(plan_status)
    except ModelXAgentError as exc:
        response = (
            "ModelX could not finish the blueprint request yet.\n\n"
            f"Reason: {exc}\n\n"
            "Please make sure the ModelX backend is running and try again with a concise ML project idea."
        )
    except Exception as exc:
        ctx.logger.exception("Unexpected ModelX Agentverse adapter error")
        response = (
            "ModelX hit an unexpected adapter error while preparing the blueprint.\n\n"
            f"Reason: {exc}"
        )

    await ctx.send(sender, _chat_message(response))


def _log_background_error(ctx: Context, task: asyncio.Task):
    try:
        task.result()
    except Exception:
        ctx.logger.exception("Background ModelX blueprint task failed")


@chat_proto.on_message(ChatAcknowledgement)
async def handle_chat_ack(ctx: Context, sender: str, msg: ChatAcknowledgement):
    ctx.logger.info("Chat response acknowledged by %s for %s", sender, msg.acknowledged_msg_id)


agent.include(chat_proto, publish_manifest=True)


if __name__ == "__main__":
    logger.info("Starting %s on port %s, forwarding requests to %s", AGENT_NAME, AGENT_PORT, BACKEND_URL)
    agent.run()
