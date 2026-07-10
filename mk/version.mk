bump-patch: bump-both-patch
bump-minor: bump-both-minor
bump-major: bump-both-major

bump-both-patch:
	python3 scripts/bump_version.py both patch

bump-both-minor:
	python3 scripts/bump_version.py both minor

bump-both-major:
	python3 scripts/bump_version.py both major

bump-api-patch:
	python3 scripts/bump_version.py api patch

bump-api-minor:
	python3 scripts/bump_version.py api minor

bump-api-major:
	python3 scripts/bump_version.py api major

bump-web-patch:
	python3 scripts/bump_version.py web patch

bump-web-minor:
	python3 scripts/bump_version.py web minor

bump-web-major:
	python3 scripts/bump_version.py web major

commit:
	python3 scripts/bump_version.py both patch
	git add api/config.json web/src/lib/version.ts
	@if [ -n "$(MSG)" ]; then git commit -m "$$MSG"; else git commit; fi

version:
	@python scripts/version.py
