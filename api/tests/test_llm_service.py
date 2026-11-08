"""Tests for llm/service.py — ConversationStore and ConversationService."""

from unittest.mock import MagicMock

import time


from football_stats.llm.service import (
    ConversationRequest,
    ConversationResponse,
    ConversationService,
    ConversationStore,
)


class TestConversationStore:
    """Tests for the in-memory conversation store with TTL expiry."""

    def test_create_and_get(self):
        """Create a conversation and retrieve it."""
        store = ConversationStore(ttl_seconds=3600)
        messages = [{"role": "user", "content": "Hello"}]
        cid = store.create(messages)
        assert isinstance(cid, str)
        assert len(cid) == 12  # uuid4().hex[:12]
        retrieved = store.get(cid)
        assert retrieved == messages

    def test_get_unknown_id(self):
        """Get a non-existent conversation returns None."""
        store = ConversationStore()
        assert store.get("nonexistent") is None

    def test_ttl_expiry(self):
        """Expired conversations are removed on get."""
        store = ConversationStore(ttl_seconds=0)  # Expire immediately
        cid = store.create([{"role": "user", "content": "Hi"}])
        # Manually age the entry
        entry = store._store[cid]
        entry.last_access = time.time() - 1
        assert store.get(cid) is None
        assert cid not in store._store  # Expired entry is deleted

    def test_append(self):
        """Append a message to an existing conversation."""
        store = ConversationStore()
        cid = store.create([{"role": "user", "content": "Hello"}])
        store.append(cid, {"role": "assistant", "content": "Hi there"})
        messages = store.get(cid)
        assert len(messages) == 2
        assert messages[1] == {"role": "assistant", "content": "Hi there"}

    def test_append_unknown_id(self):
        """Append to unknown conversation is a no-op."""
        store = ConversationStore()
        # Should not raise
        store.append("nonexistent", {"role": "assistant", "content": "Hi"})
        assert store.get("nonexistent") is None

    def test_replace_history(self):
        """Replace full history for a conversation."""
        store = ConversationStore()
        cid = store.create([{"role": "user", "content": "Old"}])
        store.replace_history(cid, [{"role": "user", "content": "New"}])
        messages = store.get(cid)
        assert len(messages) == 1
        assert messages[0] == {"role": "user", "content": "New"}

    def test_replace_history_unknown_id(self):
        """Replace history on unknown conversation is a no-op."""
        store = ConversationStore()
        # Should not raise
        store.replace_history("nonexistent", [{"role": "user", "content": "New"}])
        assert store.get("nonexistent") is None

    def test_purge_expired(self):
        """purge_expired removes expired entries and returns count."""
        store = ConversationStore(ttl_seconds=0)
        cid1 = store.create([{"role": "user", "content": "A"}])
        cid2 = store.create([{"role": "user", "content": "B"}])
        # Age both entries
        for cid in (cid1, cid2):
            store._store[cid].last_access = time.time() - 1
        removed = store.purge_expired()
        assert removed == 2
        assert store.get(cid1) is None
        assert store.get(cid2) is None

    def test_purge_expired_none(self):
        """purge_expired returns 0 when nothing is expired."""
        store = ConversationStore(ttl_seconds=3600)
        cid = store.create([{"role": "user", "content": "A"}])
        removed = store.purge_expired()
        assert removed == 0
        assert store.get(cid) is not None


class TestConversationRequestResponse:
    """Tests for request/response models."""

    def test_conversation_request(self):
        """ConversationRequest requires query, optional conversation_id."""
        req = ConversationRequest(query="Hello")
        assert req.query == "Hello"
        assert req.conversation_id is None

        req = ConversationRequest(query="Hello", conversation_id="abc123")
        assert req.conversation_id == "abc123"

    def test_conversation_response(self):
        """ConversationResponse requires answer and conversation_id."""
        resp = ConversationResponse(answer="Hi", conversation_id="abc123")
        assert resp.answer == "Hi"
        assert resp.conversation_id == "abc123"


class TestConversationServiceInit:
    """Tests for ConversationService initialization with mocks."""

    def test_service_init(self, monkeypatch):
        """ConversationService stores chain, executor, config."""
        from football_stats.llm.service import ConversationService

        chain = MagicMock()
        chain.is_available = True
        executor = MagicMock()
        config = MagicMock()
        config.conversation_ttl_seconds = 3600
        config.system_prompt = "System prompt"
        config.max_tool_iterations = 5

        service = ConversationService(chain, executor, config)
        assert service._chain is chain
        assert service._executor is executor
        assert service._config is config
        assert service.is_available is True

    def test_service_init_unavailable(self):
        """Service reports unavailable when chain is unavailable."""
        chain = MagicMock()
        chain.is_available = False
        executor = MagicMock()
        config = MagicMock()
        config.conversation_ttl_seconds = 3600
        config.system_prompt = "System prompt"
        config.max_tool_iterations = 5

        service = ConversationService(chain, executor, config)
        assert service.is_available is False
