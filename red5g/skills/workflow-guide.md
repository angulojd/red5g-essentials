---
name: workflow-guide
description: "Development workflow guide for the team. Explains when and how to use OpenSpec (planning), Essentials (execution with exit criteria), and Beads (persistent memory). Auto-activates when user asks about workflow, planning, or task management."
---

# Workflow Guide — OpenSpec + Essentials + Beads

## Quick Flow (80% of tasks)

For bugs, fixes, or tasks discussed in chat:
```
/implement-loop <task description>
```
Essentials implements, runs tests, and loops until exit criteria pass. For independent parallel tasks use `/implement-swarm`. For multi-component builds use `/implement-team`.

## Plan Flow (Medium features)
```
1. /plan-creator <feature description>
2. /plan-loop .claude/plans/<plan>.md       # or /plan-swarm or /plan-team
```

## Spec Flow (Features needing architectural design)
```
1. /opsx:propose <name>                    # OpenSpec plans
2. /plan-creator <description>             # Essentials generates plan with exit criteria
3. /plan-loop .claude/plans/<plan>.md      # Essentials executes
4. /opsx:archive                           # OpenSpec archives
```

## Multi-Session Flow (Large features, >1 day)
```
1. /opsx:propose <name>                    # OpenSpec plans
2. /plan-creator <description>             # Essentials generates plan
3. /beads-converter .claude/plans/<plan>.md # Convert to Beads
4. /beads-loop                             # Execute with persistence
5. /opsx:archive                           # Archive on completion
```
Beads persists across sessions. If interrupted, `bd ready` shows where you left off.

## Audit Rule

BEFORE closing any task, delegate to the `code-auditor` agent to review modified `.py` files. Do NOT mark as complete until ✅ verdict.

## When to Use Each Mode

| Situation | Command |
|-----------|---------|
| Quick fix discussed in chat | `/implement-loop` |
| Feature with plan | `/plan-loop` or `/plan-swarm` |
| Feature with architectural specs | OpenSpec + `/plan-loop` |
| Feature >1 session | OpenSpec + `/beads-converter` + `/beads-loop` |
| Independent parallel tasks | `/plan-swarm` or `/beads-swarm` |
| Multi-component build (frontend+backend+db) | `/plan-team` |