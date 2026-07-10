# API v1.2.1

**Released:** July 10, 2026
**Feature:** Makefile Refactor

## Changes

- Refactored: rename VPS targets to {env}-{stage} convention
- Fixed: remove redundant image loading from deploy targets
- Fixed: each target does one thing, provision chains them
- Fixed: update pre-push hook to use local-test
