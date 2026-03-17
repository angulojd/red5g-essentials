---
name: workflow-guide
description: "Development workflow guide for the team. Explains when and how to use OpenSpec (planning), Essentials (execution with exit criteria), and Beads (persistent memory). Auto-activates when user asks about workflow, planning, or task management."
---

# Workflow Guide — OpenSpec + Essentials + Beads

## Fix / Small Task (no planning needed)
```
/implement-loop <task description>
```

If you need to investigate first:
```
/opsx:explore
/implement-loop <fix based on what we found>
```

## Feature (needs architectural planning)
```
/opsx:explore                          # Investigate the problem
/opsx:propose <name>                   # OpenSpec generates proposal, specs, design, tasks
/plan-from-spec                        # Auto-detects OpenSpec change, generates Essentials plan
/plan-loop .claude/plans/<plan>.md     # Executes with exit criteria (auditor runs per task)
/opsx:archive                          # Archives specs
```

For parallel execution use `/plan-swarm` instead of `/plan-loop`.
For multi-component builds use `/plan-team` instead of `/plan-loop`.

## Feature Multi-Session (>1 day)
```
/opsx:explore                          # Investigate
/opsx:propose <name>                   # OpenSpec plans
/plan-from-spec                        # Generates Essentials plan from OpenSpec
/beads-converter .claude/plans/<plan>.md   # Converts to Beads for persistence
/beads-loop                            # Executes with persistence
/opsx:archive                          # Archives on completion
```

If session is interrupted, `bd ready` shows where you left off next time.

## Quick Reference

| Situation | Flow |
|-----------|------|
| Quick fix, clear context | `/implement-loop` |
| Fix that needs investigation | `/opsx:explore` → `/implement-loop` |
| Feature with planning | `/opsx:explore` → `/opsx:propose` → `/plan-from-spec` → `/plan-loop` → `/opsx:archive` |
| Feature >1 session | Same as above but `/beads-converter` → `/beads-loop` instead of `/plan-loop` |
| Parallel independent tasks | Use `/plan-swarm` or `/beads-swarm` instead of loop |
| Multi-component build | Use `/plan-team` instead of loop |

## Audit Rule

BEFORE closing any task, delegate to the `code-auditor` agent to review modified `.py` files. Do NOT mark as complete until ✅ verdict. This is enforced by the `python-standards` skill.

## After Every Important Feature

Update `CLAUDE.md` section "Notes for AI" with architectural decisions that future sessions must know (e.g., "Use SDK X, never direct HTTP calls").