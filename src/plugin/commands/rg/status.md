---
name: status
description: "Show current project status — active OpenSpec changes, task progress, Beads state, and quality gate results."
category: Workflow
tags: [workflow, status]
---

Show the current state of the project at a glance.

## Steps

### 1. OpenSpec changes

```bash
openspec list --json
```

Display active changes with their artifact completion and task progress. For each active change, show:
- Change name
- Artifacts: which exist (proposal, specs, design, tasks)
- Task progress: N/M complete

If no active changes: "No active changes."

### 2. Beads status (if available)

If `bd` command is available and `.beads/` exists:

```bash
bd ready --json
```

Show:
- Ready tasks (unblocked, ready to work on)
- In-progress tasks (currently claimed)
- Blocked tasks

If Beads not available, skip silently.

### 3. Quality gate check

Run a quick check (do NOT block on failures, just report):

```bash
ruff check src/ 2>&1 | tail -1
pytest tests/ -v --tb=no -q 2>&1 | tail -3
```

Show:
- ruff: passing / N issues
- pytest: N passed, M failed / no tests found

### 4. Canonical specs

List existing specs in `openspec/specs/`:
- Count of capability specs
- Brief list of capability names

### 5. Summary

```
## Project Status

### Active Changes
<change list or "No active changes">

### Beads
<ready/in-progress/blocked counts or "Not active">

### Quality Gates
- ruff: <status>
- pytest: <status>

### Canonical Specs
<N specs: capability1, capability2, ...>
```
