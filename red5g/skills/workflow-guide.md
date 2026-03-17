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
1. /opsx:explore                                                    # Investigate the problem
2. /opsx:propose <name>                                             # OpenSpec generates proposal, specs, design, tasks
3. /plan-creator Implement <name> based on openspec/changes/<name>/ # Essentials generates plan with exit criteria
4. /plan-loop .claude/plans/<plan>.md                               # Essentials executes (auditor runs per task)
5. /opsx:archive                                                    # OpenSpec archives
```

The key is passing the OpenSpec change folder to `/plan-creator` so it reads the proposal, specs, and design as context. Essentials generates its own plan with Dependency Graph, exit criteria, and per-file implementation code.

## Multi-Session Flow (Large features, >1 day)
```
1. /opsx:explore                                                    # Investigate
2. /opsx:propose <name>                                             # OpenSpec plans
3. /plan-creator Implement <name> based on openspec/changes/<name>/ # Essentials generates plan
4. /beads-converter .claude/plans/<plan>.md                         # Convert to Beads for persistence
5. /beads-loop                                                      # Execute with persistence
6. /opsx:archive                                                    # Archive on completion
```

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