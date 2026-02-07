# Release process

## 1. Bump version

```bash
uv run hatch version          # show current
uv run hatch version patch    # 0.1.0 → 0.1.1
uv run hatch version minor    # 0.1.0 → 0.2.0
uv run hatch version major    # 0.1.0 → 1.0.0
```

## 2. Update changelog

Move `[Unreleased]` entries to a new version section with today's date:

```markdown
## [0.2.0] - 2025-01-15
```

## 3. Verify

```bash
make format
make test
```

## 4. Build and test wheel

```bash
make wheel
unzip -l dist/wilco-*.whl    # check contents
make publish-test            # upload to TestPyPI
```

## 5. Commit and tag

```bash
git add -A
git commit -m "release: 0.2.0"
git tag 0.2.0
```

## 6. Push

```bash
git push origin main --tags
```

The GitHub workflow handles PyPI publishing automatically on tag push.
