---
name: workflow-guide
description: "Development workflow guide for the team. Explains when and how to use the simplified commands: /rg:explore, /rg:plan, /rg:execute, /rg:archive for features and /rg:fix for quick tasks."
---

# Workflow Guide

## Fix / Small Task

```
/rg:fix <description>
```

Investigates briefly, implements with loop until ruff passes, runs auditor. One command, done.

If during investigation it turns out to be bigger than a fix, it will stop and recommend the full flow.

## Feature (Full Flow)

```
/rg:explore <what you want to build>       # Investigate the problem
/rg:plan <feature name>                    # OpenSpec specs + Essentials plan + tests generated
                                        # ⏸ PAUSES — review tests, approve or request changes
/rg:execute                                # Loops until YOUR tests pass + ruff + auditor per task
/rg:archive                                # Archives specs, reminds to update CLAUDE.md
```

## What Each Command Does Internally

| Command | Under the Hood |
|---------|---------------|
| `/rg:explore` | `/opsx:explore` — reads codebase, identifies files, understands problem |
| `/rg:plan` | `/opsx:propose` → `/plan-creator` (Essentials) → generates pytest tests → pauses for approval |
| `/rg:execute` | `/plan-loop` (Essentials) with exit criteria = pytest + ruff, auditor runs per task |
| `/rg:archive` | `/opsx:archive` — merges specs, moves to archive |
| `/rg:fix` | Quick `/opsx:explore` → `/implement-loop` with ruff as exit criteria + auditor |

## Quick Reference

| Situation | Command |
|-----------|---------|
| Bug fix, clear context | `/rg:fix <description>` |
| Bug that needs investigation | `/rg:explore` → `/rg:fix` |
| Feature | `/rg:explore` → `/rg:plan` → `/rg:execute` → `/rg:archive` |
| Feature >1 session | Same flow but add `/beads-converter` + `/beads-loop` in execute phase |

## Rules

- `/rg:plan` ALWAYS pauses for test approval. Never auto-executes.
- `/rg:execute` loops max 5 times on same failure, then stops and asks.
- After every feature, update `CLAUDE.md` "Notes for AI" with architectural decisions.
- Auditor runs before closing every task. Non-negotiable.
