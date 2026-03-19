# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`@red5g/cli` — Node.js CLI that bootstraps Claude Code projects with the **red5g-essentials** workflow. Integrates OpenSpec (planning), Essentials plugin (execution), a code auditor agent, and ruff (linting) into 6 slash commands. Published as an npm package (`npx @red5g/cli`).

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
- **`src/utils/installer.js`** — Global tool installers with fallback strategies (npm → pipx → pip3 → curl).

### Plugin Bundle (`src/plugin/`)

These files are **copied into the target project's `.claude/` directory** by `init` and `update`. They are not executed by this CLI — they run inside Claude Code sessions.

- **`commands/rg/`** — Six slash commands (`explore`, `plan`, `execute`, `archive`, `fix`, `audit`) that orchestrate OpenSpec + Essentials + auditor.
- **`agents/`** — Three agent definitions: `code-auditor` (7-pillar quality checks), `test-generator` (pytest from specs), `git-flow` (branch/merge workflow).
- **`skills/`** — `python-standards` (coding conventions, auto-activates on `*.py`) and `workflow-guide` (when to use fix vs explore→plan).
- **`hooks/ruff-gate.py`** — PostToolUse hook that blocks Write/Edit on `.py` files if ruff check or format fails.

### Templates (`src/templates/`)

- **`backend-mysql/`** — Python 3.13 + Serverless Framework v3 + AWS Lambda + MySQL + SQLAlchemy. Includes full scaffold with handler→controller→service→repository layered architecture.
- **`generic/`** — Minimal template (CLAUDE.md, pyproject.toml, .gitignore, AGENTS.md).

## Key Design Decisions

- **ES Modules only** — `"type": "module"` in package.json, all imports use ESM syntax.
- **No dev dependencies** — No test framework, linter, or bundler for the CLI itself. Simplicity is intentional.
- **Plugin files are markdown** — Commands, agents, and skills are `.md` files with YAML frontmatter, following Claude Code's plugin specification.
- **ruff-gate.py runs in target projects** — The hook is copied to `.claude/hooks/` and configured in the target project's `.claude/settings.json`, not this repo's.
- **Init generates `settings.json`** — Includes permissions (bash tags for bd/openspec/ruff/gh/pytest, write paths for plans) and PostToolUse hook wiring.

## Workflow the CLI Enables

After `red5g init`, users run these commands inside Claude Code:

1. **Features:** `/rg:explore` → `/rg:plan` (pauses for test approval) → `/rg:execute` (loops until pytest+ruff pass) → `/rg:archive`
2. **Bug fixes:** `/rg:fix` (investigate → implement-loop with ruff gate → auditor)
3. **Manual audit:** `/rg:audit <path>`

The Essentials plugin (installed separately inside Claude Code) provides the execution engines: `/implement-loop`, `/plan-loop`, `/plan-swarm`, `/plan-team`.
