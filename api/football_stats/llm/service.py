"""Conversation service — orchestrates LLM, tools, and conversation history."""

from __future__ import annotations

import json
import logging
import time
import uuid
from typing import Any

from pydantic import BaseModel

from .chain import ProviderChain
from .config import LLMConfig
from .executor import ToolExecutor
from .tools import get_tool_definitions

logger = logging.getLogger("llm.service")


# ---------------------------------------------------------------------------
#  Request / Response models
# ---------------------------------------------------------------------------


class ConversationRequest(BaseModel):
    """Incoming request to the /conversation endpoint."""

    query: str
    conversation_id: str | None = None


class ConversationResponse(BaseModel):
    """Response from the /conversation endpoint."""

    answer: str
    conversation_id: str


# ---------------------------------------------------------------------------
#  Conversation store (in-memory with TTL)
# ---------------------------------------------------------------------------


class _ConversationEntry:
    """A single conversation stored in memory."""

    __slots__ = ("messages", "last_access")

    def __init__(self, messages: list[dict[str, Any]]):
        self.messages = messages
        self.last_access = time.time()

    def touch(self) -> None:
        self.last_access = time.time()


class ConversationStore:
    """In-memory conversation store with TTL-based expiry."""

    def __init__(self, ttl_seconds: int = 3600):
        self._store: dict[str, _ConversationEntry] = {}
        self._ttl = ttl_seconds

    def get(self, conversation_id: str) -> list[dict[str, Any]] | None:
        """Retrieve conversation history, or None if expired/missing."""
        entry = self._store.get(conversation_id)
        if entry is None:
            return None
        if time.time() - entry.last_access > self._ttl:
            del self._store[conversation_id]
            return None
        entry.touch()
        return list(entry.messages)

    def create(self, messages: list[dict[str, Any]]) -> str:
        """Create a new conversation, return its ID."""
        conversation_id = uuid.uuid4().hex[:12]
        self._store[conversation_id] = _ConversationEntry(list(messages))
        return conversation_id

    def append(self, conversation_id: str, message: dict[str, Any]) -> None:
        """Append a message to an existing conversation."""
        entry = self._store.get(conversation_id)
        if entry is not None:
            entry.messages.append(message)
            entry.touch()

    def replace_history(
        self, conversation_id: str, messages: list[dict[str, Any]]
    ) -> None:
        """Replace the full history for a conversation."""
        entry = self._store.get(conversation_id)
        if entry is not None:
            entry.messages = list(messages)
            entry.touch()

    def purge_expired(self) -> int:
        """Remove expired entries. Returns the number of entries removed."""
        now = time.time()
        expired = [
            cid for cid, e in self._store.items() if now - e.last_access > self._ttl
        ]
        for cid in expired:
            del self._store[cid]
        return len(expired)


# ---------------------------------------------------------------------------
#  Conversation service
# ---------------------------------------------------------------------------


class ConversationService:
    """Orchestrates LLM queries with tool execution and conversation memory."""

    def __init__(
        self,
        chain: ProviderChain,
        executor: ToolExecutor,
        config: LLMConfig,
    ):
        self._chain = chain
        self._executor = executor
        self._config = config
        self._store = ConversationStore(ttl_seconds=config.conversation_ttl_seconds)
        self._tools = get_tool_definitions()

    @property
    def is_available(self) -> bool:
        return self._chain.is_available

    async def chat(self, request: ConversationRequest) -> ConversationResponse:
        """Process a conversational query.

        Creates a new conversation if conversation_id is not provided or
        not found.
        """
        # Load or create history
        conversation_id = request.conversation_id
        history = None
        if conversation_id:
            history = self._store.get(conversation_id)

        if history is None:
            # New conversation — seed with system prompt
            history = [{"role": "system", "content": self._config.system_prompt}]
            conversation_id = self._store.create(history)

        assert conversation_id is not None

        # Add user message
        history.append({"role": "user", "content": request.query})

        # Agent loop
        answer = await self._agent_loop(history)

        # Store the assistant response
        self._store.append(conversation_id, {"role": "assistant", "content": answer})

        return ConversationResponse(answer=answer, conversation_id=conversation_id)

    async def _agent_loop(self, history: list[dict[str, Any]]) -> str:
        """Run the tool-calling agent loop.

        Returns the final natural language answer.
        """
        for iteration in range(self._config.max_tool_iterations):
            response = await self._chain.chat_with_tools(history, self._tools)

            if not response.tool_calls:
                # LLM returned a final answer
                return response.content or ""

            # Process tool calls
            history.append(
                {
                    "role": "assistant",
                    "content": response.content or "",
                    "tool_calls": [
                        {
                            "id": tc.id,
                            "type": "function",
                            "function": {
                                "name": tc.name,
                                "arguments": json.dumps(tc.arguments),
                            },
                        }
                        for tc in response.tool_calls
                    ],
                }
            )

            for tool_call in response.tool_calls:
                result = self._executor.execute(tool_call.name, tool_call.arguments)
                history.append(
                    {
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "content": json.dumps(result, default=str),
                    }
                )

            logger.info(
                "Agent loop iteration %d: executed %d tool(s)",
                iteration + 1,
                len(response.tool_calls),
            )

        # Max iterations reached — return last LLM response
        logger.warning(
            "Max tool iterations (%d) reached", self._config.max_tool_iterations
        )
        last_msg = history[-1]
        return last_msg.get("content", "") or (
            "I'm sorry, I couldn't fully answer your question. "
            "Please try rephrasing or asking about something more specific."
        )
