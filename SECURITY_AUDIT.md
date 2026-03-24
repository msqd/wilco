# Security audit: pre-compile bundles feature (feat/pre-compile-bundles-v2)

**Auditor**: Automated security review
**Date**: 2026-03-24
**Branch**: `feat/pre-compile-bundles-v2`
**Scope**: Pre-compilation pipeline, manifest-based loading, static file serving across 4 frameworks, Django collectstatic integration, standalone loader frontend

---

## Executive summary

The pre-compile bundles feature introduces a production build pipeline that pre-compiles TypeScript components into hashed JavaScript bundles served as static files. The audit identified **3 high-severity**, **4 medium-severity**, and **4 low-severity/informational** findings. The most critical issues are the use of `new Function()` for code execution (an `eval` equivalent requiring CSP `unsafe-eval`), a path traversal vulnerability in the Django `WilcoBundleFinder`, and missing path containment validation in the manifest reader.

---

## Findings

### FINDING-01: Code execution via `new Function()` requires CSP `unsafe-eval`

| Field | Value |
|-------|-------|
| **Severity** | HIGH |
| **CVSS 3.1** | 8.1 (AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N) |
| **CWE** | CWE-95 (Improper Neutralization of Directives in Dynamically Evaluated Code) |
| **File** | `src/wilcojs/react/src/loader/standalone.ts`, line 211 |
| **OWASP** | A03:2021 Injection |

**Vulnerable code:**

```typescript
const moduleFactory = new Function(transformedCode)
return moduleFactory() as LoadedComponent
```

**Description:** The `compileComponent` function uses `new Function()` to execute fetched JavaScript code. This is semantically equivalent to `eval()` and executes arbitrary code in the global scope. Any Content Security Policy (CSP) deployed on the host page must include `unsafe-eval` in the `script-src` directive for this to work, which significantly weakens the CSP and opens the door to other script injection attacks.

**Attack scenario:** If an attacker gains the ability to modify the manifest or intercept bundle responses (via MITM on HTTP, cache poisoning, or compromising the static file server), they can inject arbitrary JavaScript that will execute in the user's browser with full access to the DOM, cookies, and session state. The current code performs no integrity verification on fetched bundles before execution.

**Remediation:**

1. **Short-term (documentation)**: Document the CSP `unsafe-eval` requirement prominently. Warn users that deploying without HTTPS exposes them to code injection via MITM.
2. **Medium-term (SRI/integrity hashes)**: Leverage the existing content hashes in the manifest to verify bundle integrity before execution. Compare a locally computed SHA-256 of the fetched code against the manifest hash before passing it to `new Function()`.
3. **Long-term (eliminate eval)**: Investigate alternatives such as dynamic `<script>` tag injection with `type="module"`, which works under strict CSP without `unsafe-eval`. This would require restructuring how bundles export their default component.

---

### FINDING-02: Path traversal in WilcoBundleFinder.find

| Field | Value |
|-------|-------|
| **Severity** | HIGH |
| **CVSS 3.1** | 7.5 (AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N) |
| **CWE** | CWE-22 (Improper Limitation of a Pathname to a Restricted Directory) |
| **File** | `src/wilco/bridges/django/finders.py`, lines 55-58 |
| **OWASP** | A01:2021 Broken Access Control |

**Vulnerable code:**

```python
relative = path[len("wilco/"):]
full_path = self._build_path / relative

if full_path.is_file():
    matched = str(full_path)
    return [matched] if all else matched
```

**Description:** The `find` method strips the `wilco/` prefix and directly appends the remaining user-controlled path to `_build_path` without verifying the resulting path stays within the build directory. Python's `pathlib` `/` operator does not prevent `..` traversal.

**Attack scenario:** During `collectstatic` invocation (or any code path that calls `find` with a crafted path), an attacker who can influence the `path` argument could request `wilco/../../etc/passwd` or `wilco/../../config/settings.py`. The method would resolve this to a file outside the build directory and return its path, potentially exposing sensitive files.

In the standard Django collectstatic flow, the `path` argument comes from iterating other finders' results. The direct exploitability depends on whether other finders can produce adversarial path values. However, any custom code that calls `WilcoBundleFinder.find()` with user input is directly vulnerable.

**Remediation:**

```python
relative = path[len("wilco/"):]
full_path = (self._build_path / relative).resolve()

# Verify the resolved path is within the build directory
if not full_path.is_relative_to(self._build_path.resolve()):
    return [] if all else ""

if full_path.is_file():
    matched = str(full_path)
    return [matched] if all else matched
```

Use `Path.resolve()` to canonicalize the path and `Path.is_relative_to()` (Python 3.9+) to confirm containment.

---

### FINDING-03: Path traversal in Manifest.get_bundle via manifest file entry

| Field | Value |
|-------|-------|
| **Severity** | HIGH |
| **CVSS 3.1** | 7.5 (AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N) |
| **CWE** | CWE-22 (Improper Limitation of a Pathname to a Restricted Directory) |
| **File** | `src/wilco/manifest.py`, line 49 |
| **OWASP** | A01:2021 Broken Access Control |

**Vulnerable code:**

```python
file_path = self._build_dir / entry["file"]
code = file_path.read_text()
```

**Description:** The `get_bundle` method reads the `file` field from the manifest JSON and uses it directly as a path component joined to `_build_dir`. If the manifest.json has been tampered with (for example, a malicious actor inserts `"file": "../../etc/passwd"`), this would read arbitrary files from the filesystem and serve their content as a JavaScript "bundle" to the client.

**Attack scenario:** An attacker who can write to the build directory (supply chain attack, compromised CI pipeline, or a symlink attack) modifies manifest.json to point `file` entries outside the build directory. When the application serves these "bundles," it leaks arbitrary file contents to the browser.

**Remediation:**

```python
file_path = (self._build_dir / entry["file"]).resolve()

if not file_path.is_relative_to(self._build_dir.resolve()):
    return None  # or raise an error

code = file_path.read_text()
```

Additionally, validate during `build_components` that manifest entries contain only expected characters (alphanumeric, hyphens, dots, forward slashes) and no `..` components.

---

### FINDING-04: Unconditional `shutil.rmtree` on output directory without safety checks

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **CVSS 3.1** | 6.2 (AV:L/AC:L/PR:L/UI:N/S:U/C:N/I:H/A:H) |
| **CWE** | CWE-73 (External Control of File Name or Path) |
| **File** | `src/wilco/build.py`, lines 47-48 |
| **OWASP** | A01:2021 Broken Access Control |

**Vulnerable code:**

```python
if output_dir.exists():
    shutil.rmtree(output_dir)
```

**Description:** The `build_components` function unconditionally deletes the entire output directory tree before writing new bundles. The `output_dir` comes from user input (CLI `--output` flag or Django settings). There is no validation that the path is reasonable (not `/`, not a system directory, not the project root).

**Attack scenario:** A misconfiguration or malicious `--output /` command would recursively delete the entire filesystem. Even `--output .` would delete the current project directory. In CI/CD pipelines, the `output` path might come from environment variables that an attacker can influence.

**Remediation:**

1. Validate `output_dir` is not a system path and does not resolve to `/`, the user home directory, or the project root.
2. Instead of `rmtree` on the entire directory, only delete the `bundles/` subdirectory and `manifest.json` within the output path.
3. Add a safety check:

```python
resolved = output_dir.resolve()
dangerous_paths = [Path("/"), Path.home(), Path.cwd()]
if resolved in dangerous_paths or resolved == resolved.root:
    raise ValueError(f"Refusing to use dangerous output directory: {resolved}")
```

---

### FINDING-05: XSS via unescaped `component_name` and `api_base` in Django template tag

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **CVSS 3.1** | 6.1 (AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N) |
| **CWE** | CWE-79 (Improper Neutralization of Input During Web Page Generation) |
| **File** | `src/wilco/bridges/django/templatetags/wilco_tags.py`, lines 41-45 |
| **OWASP** | A03:2021 Injection |

**Vulnerable code:**

```python
html = f"""<div id="{container_id}"
 data-wilco-component="{component_name}"
 data-wilco-props='{props_json}'
 data-wilco-api="{api_base}">
</div>"""

return mark_safe(html)
```

**Description:** The `wilco_component` template tag interpolates `component_name` and `api_base` directly into HTML attributes without escaping, then marks the result as safe. While `props_json` is produced by `json.dumps` (which escapes internal quotes), `component_name` and `api_base` are raw strings. If a template author passes user-controlled data as the component name or API base (e.g., `{% wilco_component user_input %}`), an attacker can break out of the attribute and inject arbitrary HTML/JavaScript.

Note: The `props_json` is wrapped in single quotes (`'`), and `json.dumps` does not escape single quotes, which is a secondary concern if the JSON value itself contains a single quote.

**Attack scenario:** A stored XSS attack where a user controls data that flows into the `component_name` parameter: `" onmouseover="alert(1)" data-x="` would break out of the attribute context.

**Remediation:**

```python
from django.utils.html import escape

safe_component_name = escape(component_name)
safe_api_base = escape(api_base)
safe_props_json = escape(json.dumps(props))  # Use double quotes for the attribute

html = f"""<div id="{container_id}"
 data-wilco-component="{safe_component_name}"
 data-wilco-props="{safe_props_json}"
 data-wilco-api="{safe_api_base}">
</div>"""
```

The Django `WilcoComponentWidget` in `widgets.py` correctly uses `html.escape` for props but similarly does not escape `component_name`, `api_base`, or `validate_url`.

**Also affects:**
- `src/wilco/bridges/django/widgets.py`, lines 90-101
- `examples/flask/app/widgets.py`, lines 56-59
- `examples/starlette/app/widgets.py`, lines 63-66

---

### FINDING-06: Manifest fetch over HTTP without integrity verification

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **CVSS 3.1** | 5.9 (AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:H/A:N) |
| **CWE** | CWE-494 (Download of Code Without Integrity Check) |
| **File** | `src/wilcojs/react/src/loader/standalone.ts`, lines 397-401 |
| **OWASP** | A08:2021 Software and Data Integrity Failures |

**Vulnerable code:**

```typescript
const response = await fetch(manifestUrl)
if (!response.ok) return

_w.__wilcoManifest = await response.json()
```

**Description:** The standalone loader fetches the manifest JSON and trusts its content completely. There is no Subresource Integrity (SRI) check, no signature verification, and no validation of the manifest structure. A compromised or hijacked manifest could redirect component loads to attacker-controlled URLs.

Additionally, the `manifestBaseUrl` is derived from the manifest URL by string manipulation, meaning a crafted `data-wilco-manifest` attribute could point the loader to load bundles from any origin.

**Attack scenario:** An attacker who can modify the `data-wilco-manifest` attribute on the script tag (via XSS or HTML injection) can point the loader to a malicious manifest hosted on their domain, causing all component bundles to be loaded and executed from an attacker-controlled server.

**Remediation:**

1. Validate that `manifestUrl` is a same-origin relative URL before fetching.
2. Validate the manifest structure (expected keys, expected value formats) before trusting it.
3. When computing `manifestBaseUrl`, ensure it is same-origin.
4. Consider adding integrity checking by comparing bundle hashes from the manifest with locally computed hashes of fetched bundles.

---

### FINDING-07: Hardcoded secret keys in example applications

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **CVSS 3.1** | 5.3 (AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:L/A:N) |
| **CWE** | CWE-798 (Use of Hard-coded Credentials) |
| **File** | Multiple example settings files |
| **OWASP** | A07:2021 Identification and Authentication Failures |

**Affected files and values:**

- `examples/django-unfold/config/settings.py`, line 22: `SECRET_KEY = "django-insecure-97-n4kmxy!..."`
- `examples/django-vanilla/config/settings.py`, line 24: `SECRET_KEY = "django-insecure-97-n4kmxy!..."`
- `examples/flask/app/main.py`, line 36: `app.config["SECRET_KEY"] = "your-secret-key-change-in-production"`
- `examples/starlette/app/main.py`, line 215: `Middleware(SessionMiddleware, secret_key="your-secret-key-change-in-production")`

**Description:** While these are example applications with explicit "change in production" comments, the Django examples share identical insecure secret keys. Users who copy these examples without changing the keys are exposed to session forgery, CSRF bypass, and cryptographic signature attacks.

**Remediation:**

1. Generate unique keys per example using `django.core.management.utils.get_random_secret_key()` or equivalent.
2. Load secret keys from environment variables in the examples: `SECRET_KEY = os.environ.get("SECRET_KEY", get_random_secret_key())`.
3. Add a runtime warning if the insecure default key is detected.

---

### FINDING-08: `ALLOWED_HOSTS = ["*"]` when DEBUG is True in Django examples

| Field | Value |
|-------|-------|
| **Severity** | LOW |
| **CVSS 3.1** | 3.7 (AV:N/AC:H/PR:N/UI:N/S:U/C:N/I:L/A:N) |
| **CWE** | CWE-183 (Permissive List of Allowed Inputs) |
| **File** | `examples/django-unfold/config/settings.py`, line 27; `examples/django-vanilla/config/settings.py`, line 29 |
| **OWASP** | A05:2021 Security Misconfiguration |

**Vulnerable code:**

```python
ALLOWED_HOSTS = ["*"] if DEBUG else ["localhost", "127.0.0.1", "0.0.0.0"]
```

**Description:** When `DJANGO_DEBUG=True`, `ALLOWED_HOSTS` is set to `["*"]`, accepting requests with any Host header. This enables HTTP Host header injection attacks, which can lead to cache poisoning, password reset poisoning, and server-side request forgery (SSRF) via poisoned Host headers.

Additionally, `"0.0.0.0"` in the production ALLOWED_HOSTS list is unusual and may not match actual request Host headers (it would only match requests literally containing `Host: 0.0.0.0`).

**Remediation:** For examples, this is an acceptable tradeoff in development mode. Add a comment warning that `ALLOWED_HOSTS = ["*"]` must never be used in production. Remove `"0.0.0.0"` from the non-debug list.

---

### FINDING-09: Missing input validation on `_sanitize_filename` in build pipeline

| Field | Value |
|-------|-------|
| **Severity** | LOW |
| **CVSS 3.1** | 3.6 (AV:L/AC:H/PR:H/UI:N/S:U/C:N/I:L/A:L) |
| **CWE** | CWE-20 (Improper Input Validation) |
| **File** | `src/wilco/build.py`, lines 20-25 |
| **OWASP** | A03:2021 Injection |

**Code:**

```python
def _sanitize_filename(name: str) -> str:
    return name.replace(":", "--")
```

**Description:** The filename sanitization only handles colons. While the registry validates component names against `^[a-zA-Z0-9_.:]+$`, the build pipeline does not independently verify this constraint. If the registry validation is bypassed or relaxed in the future, component names containing path separators (`/`, `\`), dots (`..`), or other special characters could produce unexpected filenames or path traversal in the output directory.

**Remediation:** Defensively validate the name against the expected pattern in `_sanitize_filename` or in `build_components` before constructing the output path:

```python
def _sanitize_filename(name: str) -> str:
    if not re.match(r"^[a-zA-Z0-9_.:]+$", name):
        raise ValueError(f"Invalid component name for filename: {name!r}")
    return name.replace(":", "--")
```

---

### FINDING-10: `window.__MODULES__` global is writable and extensible

| Field | Value |
|-------|-------|
| **Severity** | LOW |
| **CVSS 3.1** | 3.4 (AV:N/AC:H/PR:N/UI:R/S:C/C:N/I:L/A:N) |
| **CWE** | CWE-915 (Improperly Controlled Modification of Dynamically-Determined Object Attributes) |
| **File** | `src/wilcojs/react/src/loader/standalone.ts`, line 121 |
| **OWASP** | A03:2021 Injection |

**Code:**

```typescript
window.__MODULES__ = moduleRegistry
```

**Description:** The module registry is exposed as a writable global. Any script running on the page (including third-party scripts, browser extensions, or injected code via XSS) can replace entries in `window.__MODULES__` to intercept component dependencies. For example, replacing the `react` entry would allow an attacker to intercept all rendering calls and steal props data.

**Remediation:**

```typescript
Object.freeze(moduleRegistry)
Object.defineProperty(window, '__MODULES__', {
  value: moduleRegistry,
  writable: false,
  configurable: false,
})
```

This provides defense-in-depth. Note that this does not protect against a determined attacker who can execute arbitrary code (since they could patch `Object.defineProperty` first), but it raises the bar against casual interference.

---

### FINDING-11: Missing security headers on static bundle responses

| Field | Value |
|-------|-------|
| **Severity** | INFORMATIONAL |
| **CWE** | CWE-693 (Protection Mechanism Failure) |
| **File** | All bridge factories and example applications |
| **OWASP** | A05:2021 Security Misconfiguration |

**Description:** The bridge endpoints set `Cache-Control: public, max-age=31536000, immutable` for bundle responses but do not set other security-relevant headers. Specifically:

- No `X-Content-Type-Options: nosniff` header, which could allow MIME-type sniffing attacks in older browsers.
- No `Content-Security-Policy` guidance is documented for deployments.
- The example applications do not configure CSP headers at all.
- No `Referrer-Policy` or `Permissions-Policy` headers are set.

The Flask example serves pre-built bundles via `send_from_directory` (line 61), which inherits Flask's default headers but adds no security headers.

**Remediation:**

1. Add `X-Content-Type-Options: nosniff` to all JavaScript bundle responses.
2. Document the minimum CSP requirements for wilco deployments (specifically `script-src 'unsafe-eval'` until FINDING-01 is addressed).
3. Add security header configuration guidance to the deployment documentation.

---

## Summary table

| ID | Severity | Title | File(s) |
|----|----------|-------|---------|
| FINDING-01 | HIGH | Code execution via `new Function()` | `standalone.ts:211` |
| FINDING-02 | HIGH | Path traversal in WilcoBundleFinder | `finders.py:55-58` |
| FINDING-03 | HIGH | Path traversal in Manifest.get_bundle | `manifest.py:49` |
| FINDING-04 | MEDIUM | Unconditional `shutil.rmtree` | `build.py:47-48` |
| FINDING-05 | MEDIUM | XSS via unescaped template params | `wilco_tags.py:41-45` |
| FINDING-06 | MEDIUM | Manifest fetch without integrity check | `standalone.ts:397-401` |
| FINDING-07 | MEDIUM | Hardcoded secret keys in examples | Multiple settings files |
| FINDING-08 | LOW | `ALLOWED_HOSTS = ["*"]` in debug | Django settings |
| FINDING-09 | LOW | Incomplete filename sanitization | `build.py:20-25` |
| FINDING-10 | LOW | Writable global module registry | `standalone.ts:121` |
| FINDING-11 | INFO | Missing security headers | All bridges |

## Positive observations

Several security practices are already well-implemented:

1. **Input validation on component names**: The `ComponentRegistry.get()` method validates names against a strict regex (`^[a-zA-Z0-9_.:]+$`), preventing injection via component name lookup at the registry level.

2. **Props escaping in widgets**: The `WilcoComponentWidget` in both the Django bridge and example apps uses `html.escape(json.dumps(self.props), quote=True)` to safely embed props in HTML attributes.

3. **Content hashing for cache busting**: Bundle filenames include SHA-256 content hashes, preventing cache poisoning with stale content.

4. **Thread-safe caching**: The `BundleCache` uses a `Lock` for thread-safe operations, preventing race conditions in multi-threaded servers.

5. **Immutable cache headers**: The `CACHE_CONTROL_IMMUTABLE` constant enables long-term caching while content hashes ensure freshness.

6. **Error handling without information leakage**: Error responses use generic messages without exposing internal paths or stack traces.

7. **Registry-based component resolution**: Components must be explicitly registered before they can be served, preventing arbitrary file serving.

8. **Sandboxed esbuild execution**: The bundler uses `subprocess.run` with a timeout and does not pass user input directly to shell commands (uses `shlex.split`).

## Recommendations priority

**Immediate (before merge):**
- Fix FINDING-02 (path traversal in finders.py) with `resolve()` and `is_relative_to()` check.
- Fix FINDING-03 (path traversal in manifest.py) with the same pattern.
- Fix FINDING-05 (XSS in template tag) by escaping `component_name` and `api_base`.

**Short-term (next sprint):**
- Address FINDING-04 (rmtree safety) with path validation.
- Address FINDING-06 (manifest integrity) with hash verification.
- Add FINDING-11 security headers to bundle responses.

**Medium-term (roadmap):**
- Address FINDING-01 (new Function) by evaluating dynamic `<script>` injection as an alternative.
- Harden FINDING-10 (global module registry) with Object.freeze.
- Update example secrets (FINDING-07) to use environment variables.
