---
name: python-standards
description: "Global Python backend coding standards for serverless AWS projects. Auto-activates for any Python file editing. Enforces PEP 8, typing, Pydantic v2, pydantic-settings, English code / Spanish docstrings, security rules, SOLID, and structured logging."
globs: ["**/*.py"]
---

# Python Code Standards — red5g

These rules are NON-NEGOTIABLE. They apply to ALL company Python projects. Also read the project's `CLAUDE.md` for domain-specific rules.

## Code Rules

### Typing & Validation
- Type hints MANDATORY on all functions: parameters AND return.
- Use `Pydantic v2` for API I/O validation. No manual dicts with asserts.
- Use `pydantic-settings` for configuration. Everything in `config.py`.

### Style
- Line-length: whatever `pyproject.toml` defines. Default: 100.
- Naming: `snake_case` for variables/functions, `PascalCase` for classes, `UPPER_SNAKE_CASE` for constants.
- 2 blank lines between top-level functions, 1 between class methods.

### Language (STRICT)
- Source code (variables, functions, classes, internal dict keys): **100% English**.
- Docstrings, inline comments, log messages: **100% Spanish**.
- Every public function, class, and module MUST have a docstring in Spanish.

### Security
- ZERO hardcoded credentials. Everything from `config.py` via `pydantic-settings`.
- FORBIDDEN: `os.environ[`, `os.getenv(` outside `config.py`.
- FORBIDDEN: `print()` in production. Use `logger`.
- Always import config as: `from config import settings`.

### Architecture
- **Handler → Controller → Service → Repository** is the strict call chain.
- Handlers: ONLY parse Lambda event + call controller. Max 5 lines. No try/except.
- Controllers: orchestrate services. Always decorated with `@handle_exceptions`.
- Functions max 100 lines. More = refactor.
- Max 3 nesting levels. Use guard clauses.
- SOLID: single responsibility per function/module, dependencies as parameters.

### Error Handling
- **NEVER use try/except in handlers or controllers.** The `@handle_exceptions` decorator handles all errors.
- Specific exceptions only, never bare `except Exception`.
- FORBIDDEN: `except: pass` (silenced errors).
- Logs with context: include request_id, user_id, relevant operation.

### Quality Workflow (MANDATORY)
- PostToolUse hook runs `ruff check` + `ruff format --check` on every Write/Edit of `.py`. Blocks if fails.
- **BEFORE marking ANY task as complete** (whether via OpenSpec /opsx:apply, Essentials /plan-loop, or manual work), you MUST delegate to the `code-auditor` agent to review all modified `.py` files.
- If code-auditor returns 🔴 Critical issues, you MUST fix them before closing the task.
- Do NOT proceed to the next task until code-auditor gives ✅ verdict.
- This is NON-NEGOTIABLE. Skipping the audit is equivalent to shipping broken code.

### Git
- Conventional Commits: `feat(scope): description`, `fix(scope): description`, etc.
- Git Flow: feature/* from develop, release/* and hotfix/* per pattern.
- Use the `git-flow` agent for branching operations.