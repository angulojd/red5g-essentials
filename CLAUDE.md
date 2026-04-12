# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`@red5g/cli` — Node.js CLI that bootstraps Claude Code projects with the **red5g** workflow. Integrates OpenSpec (spec-driven planning), code auditor agent, ruff linting, and quality gates — all in 7 slash commands. Published as an npm package (`npx @red5g/cli`).

**Language:** The project documentation and user-facing strings are in **Spanish**. Code identifiers and comments are in English.

## Commands

There are no build/lint/test scripts. The CLI is plain ES module JavaScript with no compilation step.

```bash
# Run locally during development
node bin/red5g.js init
node bin/red5g.js doctor
node bin/red5g.js update
```

## Architecture

### CLI Layer (Node.js, ES Modules)

- **`bin/red5g.js`** — Entry point. Uses Commander to define 3 commands: `init`, `doctor`, `update`.
- **`src/commands/init.js`** — Main orchestrator: git check, template selection, tool installation (OpenSpec/ruff/Beads), plugin copy to `.claude/`, scaffold generation.
- **`src/commands/doctor.js`** — Environment verifier: checks global tools, project files, plugin integrity.
- **`src/commands/update.js`** — Refreshes plugin files in `.claude/` from bundled sources, repairs settings.json hooks.
- **`src/utils/logger.js`** — Chalk-based output helpers (info/success/warn/error/step).
- **`src/utils/installer.js`** — Tool installers: OpenSpec, ruff (curl → pipx → pip3), Beads (brew → curl).

### Plugin Bundle (`src/plugin/`)

These files are **copied into the target project's `.claude/` directory** by `init` and `update`. They are not executed by this CLI — they run inside Claude Code sessions.

- **`commands/rg/`** — Seven slash commands (`explore`, `plan`, `execute`, `archive`, `fix`, `feasibility`, `audit`) that use OpenSpec CLI for spec management and add quality gates on top.
- **`agents/`** — Five agent definitions: `orchestrator` (orchestrates execution: delegates to code-writers, runs quality gates), `code-writer` (implements a single task), `test-generator` (pytest from specs), `code-auditor` (7-pillar quality checks), `git-flow` (branch/merge workflow).
- **`skills/`** — `python-standards` (coding conventions, auto-activates on `*.py`), `workflow-guide` (when to use fix vs explore→plan).
- **`hooks/ruff-gate.py`** — PostToolUse hook that blocks Write/Edit on `.py` files if ruff check or format fails.

### Templates (`src/templates/`)

- **`backend-mysql/`** — Python 3.13 + Serverless Framework v3 + AWS Lambda + MySQL + SQLAlchemy. Includes full scaffold with handler→controller→service→repository layered architecture.
- **`quuo/`** — Quuo 3 fintech stack (Python 3.12 + Serverless v3 + Lambda + Cognito + repos base de Bitbucket). Scaffold con `Classes/`, `handlers/`, `Helpers/` y `schemas/` (estos 2 opcionales vacíos), `tests/`, `requirements/{dev.in, lock.in, requirements-{dev,git,lock}.txt, readme.txt}`, `setup.py`, `script.py`, `serverless.yml`, `bitbucket-pipelines.yml`, `dependences.json`. Incluye `extraSkills: ["quuo3-dev"]` que copia el skill `quuo3-dev` (SKILL.md slim de ~370 líneas + 7 references + tables_structure.csv) a `.claude/skills/` solo cuando se elige este template. `init.js` detecta si el cwd ya es un repo Quuo existente y omite los archivos de ejemplo (`QUUO_EXAMPLE_FILES`) para no contaminar.
- **`generic/`** — Minimal template (CLAUDE.md, pyproject.toml, .gitignore).

**Skills extras condicionales:** un template puede declarar `extraSkills: [...]` en el dict `TEMPLATES` de `init.js`. Para cada nombre, busca `src/templates/<tmpl>/skills/<skillName>/` y lo copia recursivo a `.claude/skills/<skillName>/`. `update.js` mantiene un mapa `TEMPLATE_EXTRA_SKILLS` (sincronizar manualmente) y refresca la skill solo si ya está instalada en el proyecto.

## Key Design Decisions

- **ES Modules only** — `"type": "module"` in package.json, all imports use ESM syntax.
- **No dev dependencies** — No test framework, linter, or bundler for the CLI itself. Simplicity is intentional.
- **OpenSpec for spec management** — `openspec/` directory structure (specs/ + changes/) is managed by the OpenSpec CLI. The `/rg:*` commands use it directly instead of replicating its logic.
- **Plugin files are markdown** — Commands, agents, and skills are `.md` files with YAML frontmatter, following Claude Code's plugin specification.
- **ruff-gate.py runs in target projects** — The hook is copied to `.claude/hooks/` and configured in the target project's `.claude/settings.json`, not this repo's.
- **Init generates `settings.json`** — Includes permissions (bash tags for openspec/ruff/gh/pytest/bd, write paths for openspec) and PostToolUse hook wiring.

## Workflow the CLI Enables

After `red5g init`, users run these commands inside Claude Code:

1. **Features:** `/rg:explore` → `/rg:plan` (pauses for test approval) → `/rg:execute` (loops until pytest+ruff pass) → `/rg:archive`
2. **Bug fixes:** `/rg:fix` (investigate → implement loop with ruff gate → auditor)
3. **HU validation:** `/rg:feasibility` (validates user story against codebase, posts to ClickUp)
4. **Manual audit:** `/rg:audit <path>`

All spec artifacts live in `openspec/` (managed by OpenSpec CLI). Fix logs in `.claude/fixes/`.
