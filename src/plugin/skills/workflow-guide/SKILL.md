---
name: workflow-guide
description: "Development workflow guide for the team. Explains when and how to use the simplified commands: /rg:explore, /rg:feasibility, /rg:plan, /rg:execute, /rg:archive for features, /rg:fix for quick tasks, and the PM → Dev handoff flow."
---

# Workflow Guide

## Fix / Small Task

```
/rg:fix <description>
```

Investigates briefly, saves findings to `.claude/fixes/`, implements with loop until ruff passes, runs auditor. One command, done.

If during investigation it turns out to be bigger than a fix, it will stop and recommend the full flow.

## Feature from PM (HU already exists)

```
/rg:feasibility <path-to-hu.md>           # Validates HU against real codebase
                                           # → feedback to PM if needed
/rg:plan <feature name>                    # Reads feasibility → specs + plan + tests
                                           # ⏸ PAUSES — review tests, approve or request changes
/rg:execute                                # Loops until tests pass + ruff + auditor per task
/rg:archive                                # Archives OpenSpec + plan + closes Beads
```

## Feature from Scratch (no HU)

```
/rg:explore <what you want to build>       # Investigate → saves exploration.md
/rg:plan <feature name>                    # Reads exploration → specs + plan + tests
                                           # ⏸ PAUSES — review tests, approve or request changes
/rg:execute                                # Loops until tests pass + ruff + auditor per task
/rg:archive                                # Archives OpenSpec + plan + closes Beads
```

## What Each Command Does Internally

| Command | Under the Hood |
|---------|---------------|
| `/rg:feasibility` | Reads HU + codebase → checks what exists vs what's missing → **saves `feasibility.md`** with verdict + effort estimate |
| `/rg:explore` | `/opsx:explore` — reads codebase, identifies files, **saves findings to `exploration.md`** |
| `/rg:plan` | Reads `exploration.md` or `feasibility.md` → `/opsx:propose` → `/plan-creator` (Essentials) → delegates test generation → pauses for approval |
| `/rg:execute` | `/plan-loop` (Essentials) with exit criteria = pytest + ruff, auditor runs per task, syncs to OpenSpec tasks |
| `/rg:archive` | `/opsx:archive` + moves plan to `.claude/plans/archive/` + closes Beads tasks |
| `/rg:fix` | Quick investigation → **saves to `.claude/fixes/`** → `/implement-loop` with ruff + auditor |
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
        │                              ✅ viable / ⚠️ conditions / ❌ no
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
| `/rg:feasibility` | `openspec/feasibility/<n>/feasibility.md` | ✅ |
| `/rg:explore` | `openspec/changes/<n>/exploration.md` | ✅ |
| `/rg:plan` | `openspec/changes/<n>/proposal.md`, `specs/`, `design.md`, `tasks.md` | ✅ |
| `/rg:plan` | `.claude/plans/<plan>.md` | ✅ |
| `/rg:plan` | `tests/test_controllers/test_*.py` | ✅ |
| `/rg:execute` | Marks `[x]` in plan + OpenSpec `tasks.md` | ✅ |
| `/rg:fix` | `.claude/fixes/<timestamp>-<n>.md` | ✅ |
| `/rg:archive` | Plan → `.claude/plans/archive/` | ✅ |

## Quick Reference

| Situation | Command |
|-----------|---------|
| Bug fix, clear context | `/rg:fix <description>` |
| Bug that needs investigation | `/rg:explore` → `/rg:fix` |
| PM gave me an HU | `/rg:feasibility` → `/rg:plan` → `/rg:execute` → `/rg:archive` |
| Feature from scratch | `/rg:explore` → `/rg:plan` → `/rg:execute` → `/rg:archive` |
| Feature >1 session | Same flow but add `/beads-converter` + `/beads-loop` in execute phase |

## Rules

- `/rg:feasibility` does NOT implement anything. It validates and reports.
- `/rg:plan` requires either `exploration.md` or `feasibility.md` first.
- `/rg:plan` ALWAYS pauses for test approval. Never auto-executes.
- `/rg:execute` loops max 5 times on same failure, then stops and asks.
- All findings persist to disk — safe against compaction and session loss.
- After every feature, update `CLAUDE.md` "Notes for AI" with architectural decisions.
- Auditor runs before closing every task. Non-negotiable.