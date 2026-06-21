# Run inside the API container (VS Code attach, or docker exec)
.PHONY: serve dev test test-cov mcp

serve:
	uv run python football_stats/server.py --host 0.0.0.0 --port 7531

dev:
	uv run uvicorn football_stats.server:app --host 0.0.0.0 --port 7531 --reload

test:
	uv sync && PYTHONPATH=football_stats uv run pytest tests/ -v --color=yes

test-cov:
	uv sync && PYTHONPATH=football_stats uv run pytest tests/ -v --color=yes --cov=football_stats --cov-report=term-missing

mcp:
	uv run python football_stats/mcp_server.py --transport stdio
