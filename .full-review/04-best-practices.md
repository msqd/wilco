# Phase 4: Best Practices & Standards

## Framework & Language Findings (4A)

### Medium
1. **`Optional[X]` vs `X | None` inconsistency** in `base.py` - project requires Python 3.11+
2. **esbuild target mismatch**: bundler uses `es2020`, tsconfig uses `ES2022`, loader build uses `esnext`
3. **Django `<path:name>` URL allows slashes** - should use `<str:name>` since component names can't contain `/`
4. **Standalone loader Suspense pattern is legacy** - React 19's `use()` API is recommended over throw-promise pattern
5. **DOM expando properties** for React roots - `WeakMap` would be more GC-friendly

### Low
6. `Component` dataclass not frozen (all others are)
7. Management command lacks type hints
8. `WilcoBundleFinder.__init__` signature doesn't match Django finder convention
9. Module-level `app = None` sentinel is dead state (uvicorn uses factory mode)
10. `goober` CSS-in-JS dependency maintenance cadence slowing

## CI/CD & DevOps Findings (4B)

### High
1. **CI does not run E2E tests** - GitHub Actions only runs backend + frontend unit tests. The entire prod-mode serving path is untested in CI.
2. **5 of 7 examples: `start-prod` does not depend on `build`** - Flask, FastAPI, Starlette, ASGI, WSGI examples let users run `make start-prod` without building first. Silent fallback to live bundling.

### Medium
3. **Sequential builds with no parallelism** - Both the orchestrator and individual builds run esbuild sequentially.
4. **Flask/Starlette prod mode nearly identical to dev** - No gunicorn/production WSGI server. Only difference is `--debug`/`--reload` flag.
5. **No deployment docs or containerization** - No Dockerfiles, no CI/CD integration guide.

### Low
6. No observability for production bundle serving (no logging, metrics)
7. Build reproducibility not guaranteed (unpinned esbuild discovery)
8. E2E runs serially despite independent server ports
9. `forbidOnly` guard is dead code (CI never runs E2E)
