# Run inside the Web container (VS Code attach, or docker exec)
.PHONY: serve dev build lint test

serve:
	pnpm dev --port 3000 --hostname 0.0.0.0

dev: serve

build:
	pnpm build

lint:
	pnpm lint

test:
	pnpm vitest run
