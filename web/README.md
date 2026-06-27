# Internation Football Results - WEB App

## Design

## Make Targets
 In the WEB App we Have targets to run it isolated not together with API
 Make targets in Web App are supposed to run stand alone or INSIDE a container. For container targets look at the root Makefile
 There are targets to build, to test, to lint, to serve.

### Flags

Country flag SVGs are served locally from `public/flags/`. To download them:

```bash
make flags
# or
node bin/download-flags.mjs
```

This downloads all flags used by the app from `flagcdn.com`. Flags are gitignored and must be downloaded before building or running the dev server. The `build` target automatically runs `flags` first.

## How to Build

## How to Run

## Features
