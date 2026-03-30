---
name: workflow-guide
description: "Development workflow guide for the team. Explains when and how to use the commands: /rg:explore, /rg:feasibility, /rg:plan, /rg:execute, /rg:archive for features, /rg:fix for quick tasks, and the PM → Dev handoff flow."
---

# Workflow Guide

## Always Start with Explore

```
/rg:explore <description>                  # Investigate — explore recommends next step
```

Explore analyzes the problem and recommends:
- **Small (bug, 1-3 files)** → `/rg:fix` (lightweight OpenSpec change, auto-archives)
- **Large (feature, multiple components)** → `/rg:plan` → `/rg:execute` → `/rg:archive`

## Small Fix (recommended by explore)

```
/rg:fix <name>                             # Lightweight OpenSpec change + orchestrator + archive
                                           # All in one command, spec persists for future reference
```

## Feature (recommended by explore)

```
/rg:plan <feature name>                    # Creates OpenSpec artifacts + tests
                                           # PAUSES — review, approve or request changes
/rg:execute                                # Orchestrator implements tasks with quality gates
/rg:archive                                # Syncs specs, archives change
```

## Feature from PM (HU exists)

```
/rg:feasibility <hu.md or ClickUp URL>    # Validates HU against real codebase
                                           # → feedback to PM if needed
/rg:explore <description>                  # Investigate → recommends fix or plan
... then fix or plan flow
```

## What Each Command Does Internally

| Command | Under the Hood |
|---------|---------------|
| `/rg:feasibility` | Reads HU + codebase → checks what exists vs what's missing → **saves `feasibility.md`** to `openspec/changes/<n>/` with verdict + effort estimate |
| `/rg:explore` | Thinking partner — explores codebase, visualizes, questions assumptions. No artifacts, context lives in session. |
| `/rg:plan` | Reads session context or `feasibility.md` → OpenSpec CLI creates change → session principal generates artifacts → delegates to `test-generator` → creates beads (optional) → pauses for approval |
| `/rg:execute` | Delegates to `orchestrator` agent → `code-writer` per task → pytest + ruff + `code-auditor` per task |
| `/rg:archive` | Moves change to `openspec/changes/archive/` + plan to `openspec/changes/archive/` |
| `/rg:fix` | Quick investigation → lightweight OpenSpec change (proposal + spec + tasks) → delegates to `orchestrator` → archives with spec persisted |
| `/rg:audit` | Delegates to `code-auditor` agent for quality review |

## PM → Dev Handoff

```
PM (Claude Chat + ClickUp)              Dev (Claude Code)
        │                                       │
        ▼                                       │
  Structures HU with                            │
  Story Writer agent                            │
  (7 sections + errors)                         │
        │                                       │
        ▼                                       │
  Creates task in ClickUp                       │
        │                                       │
        ├──── HU ──────────────────────────────▶│
        │                                       ▼
        │                              /rg:feasibility hu.md
        │                              (reads REAL code)
        │                                       │
        │                                       ▼
        │                              feasibility.md:
        │                              viable / conditions / no
        │                              + effort estimate
        │                              + what exists / what's missing
        │                                       │
        │◀──── feedback ────────────────────────┤
        │                                       │
        ▼                                       ▼
  Adjusts HU if needed              /rg:plan → /rg:execute → /rg:archive
```

## What Gets Persisted to Disk

| Command | File | Survives compaction? |
|---------|------|---------------------|
| `/rg:feasibility` | `openspec/changes/<n>/feasibility.md` | Yes |
| `/rg:explore` | No artifacts — context lives in session | — |
| `/rg:plan` | `openspec/changes/<n>/proposal.md`, `specs/`, `design.md`, `tasks.md` | Yes |
| `/rg:plan` | `openspec/changes/<name>/proposal.md`, `design.md`, `tasks.md`, `specs/` | Yes |
| `/rg:plan` | `tests/test_controllers/test_*.py` | Yes |
| `/rg:execute` | Marks `[x]` in plan + change `tasks.md` | Yes |
| `/rg:fix` | `openspec/changes/fix-<name>/` → archived + spec persisted in `openspec/specs/` | Yes |
| `/rg:archive` | Specs → `openspec/specs/`, Change → `openspec/changes/archive/`, Plan → `openspec/changes/archive/` | Yes |

## Quick Reference

| Situation | Command |
|-----------|---------|
| Anything new | `/rg:explore` → explore recommends fix or plan |
| Small fix (explore said so) | `/rg:fix <name>` |
| Feature (explore said so) | `/rg:plan` → `/rg:execute` → `/rg:archive` |
| PM gave me an HU | `/rg:feasibility` → `/rg:explore` → fix or plan |
| Manual audit | `/rg:audit <path>` |

## Beads Integration (Optional)

Beads (`bd`) provides persistent task tracking across sessions. If installed, it integrates automatically:

| Situation | Use Beads? | Why |
|-----------|-----------|-----|
| Feature >1 session | Yes | Tasks persist across sessions via `bd ready` |
| Feature in 1 session | Optional | OpenSpec tasks.md is sufficient |
| Bug fix (`/rg:fix`) | Optional | Fix now uses OpenSpec, beads work if active |

**How it works:**
- `/rg:plan` creates beads automatically if `bd` is available (epic + child tasks with full context)
- `/rg:execute` uses `bd ready` to find unblocked tasks, `bd update --claim` to claim, `bd close` to complete
- `/rg:archive` closes remaining beads and runs `bd sync`
- On session pause: `bd sync` persists state, next session picks up with `bd ready`

**Session handoff pattern:**
```
## End of session
bd sync                    # Persist bead state
git push                   # Push code changes

## Start of next session
bd ready --json            # See what's ready to work on
bd update <id> --claim     # Claim next task
```

## Git Workflow

Use the `git-flow` agent for branching operations:
- Create feature branches: `feature/<name>` from develop
- Create release branches: `release/vX.Y.Z` from develop
- Create hotfix branches: `hotfix/<name>` from main
- Conventional Commits format: `feat(scope): description`, `fix(scope): description`

## Rules

- Always start with `/rg:explore` — it recommends fix or plan.
- `/rg:feasibility` does NOT implement anything. It validates and reports.
- `/rg:plan` ALWAYS pauses for test approval. Never auto-executes.
- `/rg:execute` loops max 5 times on same failure, then stops and asks.
- All findings persist to disk — safe against compaction and session loss.
- If Beads is active, always `bd sync` before ending a session.
- After every feature, update `CLAUDE.md` "Notes for AI" with architectural decisions.
- Auditor runs before closing every task. Non-negotiable.
- Pre-commit hook blocks `git commit` if ruff or pytest fail.
