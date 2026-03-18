---
name: execute
description: "Execute the current plan using Essentials plan-loop. Loops until pytest tests pass and ruff check passes. Runs code-auditor before closing each task. Syncs completion to OpenSpec tasks. Use after /rg:plan has been approved."
---

Execute the current Essentials plan with full quality gates.

## Pre-flight

- Verify `/plan-loop` is available (Essentials plugin). If not → "Install Essentials: `/plugin marketplace add GantisStorm/essentials-claude-code` then `/plugin install essentials@essentials-claude-code`."

## Instructions

### Pre-flight Checks

1. **Verify plan exists:** Look for the most recent `.md` file in `.claude/plans/`. If no plan found, tell the user to run `/rg:plan` first.

2. **Verify tests exist:** Check `tests/test_controllers/` for test files. If no tests found, tell the user to run `/rg:plan` first (which generates tests).

3. **Verify tests fail:** Run `pytest tests/test_controllers/ -v`. Tests SHOULD fail at this point (nothing is implemented yet). If they pass, something is wrong — ask the user.

4. **Locate OpenSpec tasks:** Find the active OpenSpec change directory (`openspec/changes/<name>/tasks.md`). This will be used to sync task completion.

### Execution

1. **Invoke Essentials plan-loop:**
   - Run `/plan-loop` with the plan file path from `.claude/plans/`.
   - The exit criteria in the plan should be: `pytest tests/test_controllers/ -v && ruff check src/`

2. **Quality gate per task:**
   - The `python-standards` skill instructs: before marking any task complete, delegate to `code-auditor` to review modified `.py` files.
   - If auditor returns 🔴 Critical → fix before proceeding.
   - If auditor returns ✅ → mark task complete, continue.

3. **Sync to OpenSpec per task:**
   - After each Essentials task is marked complete, find the corresponding task in `openspec/changes/<name>/tasks.md` and mark it as `[x]`.
   - Match by task description — the Essentials plan tasks were generated from OpenSpec tasks, so descriptions should align.
   - If no matching OpenSpec task is found, skip (some Essentials tasks may be implementation-only with no OpenSpec counterpart).

4. **Loop continues** until:
   - All tasks are completed
   - All pytest tests pass
   - ruff check passes

### Completion

When the loop finishes:

```
## ✅ Execution Complete

- Tasks completed: X/X
- Tests passing: X/X
- Auditor: ✅ All files approved
- Exit criteria: ✅ pytest + ruff passing
- OpenSpec tasks synced: Y/Z marked complete

Next step: /rg:archive to close this change.
```

### If Stuck

- If loop fails repeatedly on the same test → stop and show the user which test is failing and why.
- If auditor keeps finding critical issues → stop and ask the user for guidance.
- Do NOT loop more than 5 times on the same failure.
