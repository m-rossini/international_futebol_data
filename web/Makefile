.PHONY: serve dev build lint test

serve:
	pnpm next dev --port 3000 --hostname 0.0.0.0

dev: serve

build:
	pnpm next build

lint:
	pnpm eslint .

test:
	pnpm vitest run
