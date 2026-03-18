---
name: archive
description: "Archive the completed change. Closes OpenSpec specs, moves Essentials plan to archive, closes Beads tasks if active. Use after /rg:execute completes successfully."
---

Archive the completed change and clean up all systems.

## Pre-flight

- Verify `openspec/` directory exists. If not → "OpenSpec not initialized. Run `openspec init --tools claude` first."

## Instructions

### Step 1: Verify execution is complete

- Run `pytest tests/test_controllers/ -v` — all tests must pass.
- Run `ruff check src/` — must pass.
- If either fails, tell the user: "Tests or ruff failing. Run `/rg:execute` first."

### Step 2: Archive OpenSpec change

- Run `/opsx:archive` to merge delta specs into main specs and move the change to `openspec/changes/archive/`.

### Step 3: Archive Essentials plan

- Find the plan that was just executed in `.claude/plans/` (most recent `.md` file with all tasks marked `[x]`).
- Create `.claude/plans/archive/` directory if it doesn't exist.
- Move the completed plan file to `.claude/plans/archive/`.
- This prevents future `/rg:execute` from picking up old completed plans.

### Step 4: Close Beads tasks (if active)

- Check if `.beads/` directory exists and `bd` command is available.
- If yes, run `bd list --status open --json` to find open tasks related to this change.
- For each open task that was part of this execution, close it: `bd close <id> --reason "Completed via /rg:archive"`.
- Run `bd sync` to push state to git.
- If Beads is not initialized, skip this step silently.

### Step 5: Remind about CLAUDE.md

- If this feature introduced architectural decisions that future sessions must know (new SDK, new service pattern, new integration), tell the user:
  "This feature introduced [X]. Consider adding a note to CLAUDE.md section 'Notes for AI'."

### Step 6: Summary

```
## 📦 Archived

- OpenSpec change: <change-name>
  - Specs merged into: openspec/specs/
  - Archived to: openspec/changes/archive/
- Essentials plan: <plan-file>.md
  - Moved to: .claude/plans/archive/
- Beads: X tasks closed (or "not active")
- Tests: ✅ passing
- ruff: ✅ passing

💡 Update CLAUDE.md "Notes for AI" if this changed how the project works.
```
