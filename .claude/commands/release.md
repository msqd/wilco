---
description: Create a new release with version bump and changelog update
---

# Release

Follow the release process from @RELEASE.md.

## Steps

1. Show current version: `uv run hatch version`
2. Ask the user which version bump they want (patch, minor, major)
3. Bump version with: `uv run hatch version <bump>`
4. Update CHANGELOG.md: move [Unreleased] entries to new version section with today's date
5. Run `make format` and `make test`
6. Build wheel: `make wheel`
7. Check wheel contents: `unzip -l dist/wilco-*.whl`
8. Publish to TestPyPI: `make publish-test`
9. Stage all changes: `git add -A`
10. Commit with message: `release: <version>`
11. Create tag: `git tag <version>`
12. Ask user for confirmation before pushing
13. Push with tags: `git push origin main --tags`

Use AskUserQuestion to get the version bump choice before proceeding.