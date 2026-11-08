"""Tests for mcp_server.py — MCP server module."""

import sys
from unittest.mock import MagicMock, patch

import pytest


@pytest.fixture(autouse=True)
def mock_mcp_and_fastmcp():
    """Mock the mcp package so mcp_server can be imported without the mcp package installed."""
    # Create mock mcp.server.fastmcp module
    mock_fastmcp = MagicMock()
    mock_fastmcp.FastMCP = MagicMock()
    mock_fastmcp.FastMCP.return_value = MagicMock()

    # Patch sys.modules so 'import mcp.server.fastmcp' works
    mock_mcp_server = MagicMock()
    mock_mcp_server.fastmcp = mock_fastmcp
    sys.modules["mcp"] = MagicMock()
    sys.modules["mcp"].server = mock_mcp_server
    sys.modules["mcp.server"] = mock_mcp_server
    sys.modules["mcp.server.fastmcp"] = mock_fastmcp

    # Also patch the attribute on the mcp_server module once it's imported
    with patch("football_stats.mcp_server.FastMCP", mock_fastmcp.FastMCP):
        yield mock_fastmcp

    # Cleanup
    for mod in ("mcp.server.fastmcp", "mcp.server", "mcp"):
        if mod in sys.modules:
            del sys.modules[mod]


class TestFilterParams:
    """Tests for the _filter_params helper function."""

    def test_empty_params(self):
        """All None returns empty dict."""
        from football_stats.mcp_server import _filter_params

        result = _filter_params()
        assert result == {}

    def test_single_param(self):
        """Single param returns dict with that key."""
        from football_stats.mcp_server import _filter_params

        result = _filter_params(tournaments="FIFA World Cup")
        assert result == {"tournaments": "FIFA World Cup"}

    def test_all_params(self):
        """All params returned as dict."""
        from football_stats.mcp_server import _filter_params

        result = _filter_params(
            tournaments="FIFA World Cup",
            countries="Brazil",
            date_from="2020-01-01",
            date_to="2020-12-31",
        )
        assert result == {
            "tournaments": "FIFA World Cup",
            "countries": "Brazil",
            "date_from": "2020-01-01",
            "date_to": "2020-12-31",
        }

    def test_empty_string_omitted(self):
        """Empty string params are omitted."""
        from football_stats.mcp_server import _filter_params

        result = _filter_params(tournaments="", countries="Brazil")
        assert result == {"countries": "Brazil"}

    def test_none_omitted(self):
        """None params are omitted."""
        from football_stats.mcp_server import _filter_params

        result = _filter_params(tournaments=None, countries=None)
        assert result == {}


class TestGetClient:
    """Tests for the _get_client helper."""

    def test_creates_client(self):
        """_get_client creates an httpx.Client."""
        from football_stats.mcp_server import _get_client

        with patch("football_stats.mcp_server.httpx.Client") as mock_client:
            mock_instance = MagicMock()
            mock_client.return_value = mock_instance
            client = _get_client()
            assert client is mock_instance
            mock_client.assert_called_once_with(
                base_url="http://localhost:7531", timeout=30
            )

    def test_reuses_client(self):
        """_get_client returns the same client on subsequent calls."""
        import football_stats.mcp_server as mcp_server

        # Reset the global client
        mcp_server._client = None
        with patch("football_stats.mcp_server.httpx.Client") as mock_client:
            mock_instance = MagicMock()
            mock_instance.is_closed = False
            mock_client.return_value = mock_instance
            c1 = mcp_server._get_client()
            c2 = mcp_server._get_client()
            assert c1 is c2
            # Client constructor called once, is_closed checked on second call
            assert mock_client.call_count == 1


class TestModuleImport:
    """Tests that the module can be imported with mocked FastMCP."""

    def test_import_with_mocked_fastmcp(self, mock_mcp_and_fastmcp):
        """Module imports successfully when FastMCP is mocked."""
        import importlib

        import football_stats.mcp_server as mcp_server

        importlib.reload(mcp_server)
        assert mcp_server.mcp is mock_mcp_and_fastmcp.FastMCP.return_value


class TestGetToolDefinitions:
    """Tests for get_tool_definitions (used by LLM service)."""

    def test_get_tool_definitions(self):
        """get_tool_definitions returns a list of tool schemas."""
        from football_stats.llm.tools import get_tool_definitions

        tools = get_tool_definitions()
        assert isinstance(tools, list)
        assert len(tools) > 0
        # Each tool definition should have required fields
        for tool in tools:
            assert "function" in tool
            assert "name" in tool["function"]
            assert "description" in tool["function"]
            assert "parameters" in tool["function"]
