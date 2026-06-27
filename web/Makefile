.PHONY: serve dev build lint test flags

serve:
	pnpm next dev --port 3000 --hostname 0.0.0.0

dev: serve

build: flags
	pnpm next build

flags:
	node bin/download-flags.mjs

lint:
	pnpm eslint .

test:
	pnpm vitest run
