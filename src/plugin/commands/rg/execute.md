---
name: execute
description: "Implement tasks from an OpenSpec change. Orchestrates code-writer, code-auditor, and orchestrator agents from the session principal — no nested agent delegation."
category: Workflow
tags: [workflow, execution]
---

Implement tasks from an OpenSpec change. You (the session principal) orchestrate everything — delegating to agents one at a time, never nesting agent calls.

**Input**: Optionally specify a change name (e.g., `/rg:execute add-auth`). If omitted, check if it can be inferred from conversation context. If vague or ambiguous you MUST prompt for available changes.

**Steps**

1. **Select the change**

   If a name is provided, use it. Otherwise:
   - Infer from conversation context if the user mentioned a change
   - Auto-select if only one active change exists
   - If ambiguous, run `openspec list --json` to get available changes and use the **AskUserQuestion tool** to let the user select

   Always announce: "Using change: <name>"

2. **Verify pre-conditions**

   ```bash
   openspec status --change "<name>" --json
   ```

   **Handle states:**
   - If `state: "blocked"` (missing artifacts): show message, suggest `/rg:plan`
   - If `state: "all_done"`: congratulate, suggest `/rg:archive`
   - Otherwise: proceed

   Check `tests/` for test files. If none → "Run `/rg:plan` first (which generates tests)."

3. **Load context**

   ```bash
   openspec instructions apply --change "<name>" --json
   ```

   Read:
   - ALL files listed in `contextFiles`
   - `CLAUDE.md` — project standards
   - The tasks file to get the full task list with statuses
   - `design.md` — including CONTRACTS section if present

4. **Snapshot existing tests (CRITICAL)**

   Before any implementation:
   ```bash
   pytest tests/ -v --tb=no -q 2>&1
   ```

   Record which tests exist and which are passing. This is the **baseline**. Any test passing before and failing after is a **regression** — fix the code, NOT the test.

5. **Implementation loop — for each pending task**

   For each task marked `- [ ]`, in dependency order:

   **a. Announce:**
   ```
   ## Task N/M: <task description>
   ```

   **b. Delegate to `code-writer` agent:**

   Pass the code-writer:
   - Task description
   - Relevant requirements from specs (WHEN/THEN scenarios)
   - Technical decisions from design.md (including contracts if present)
   - Files to create or modify
   - Existing code patterns (read files the task will touch)

   Wait for the code-writer to return its summary.

   **c. Delegate to `code-auditor` agent:**

   Pass the code-auditor the list of files the code-writer created or modified.

   Wait for the auditor's report.

   **d. Handle audit result:**

   - If auditor verdict is **Approved** (no critical issues) → task done, continue to next task
   - If auditor has **Critical issues**:
     1. Delegate to `code-writer` with the audit report — tell it to fix the critical issues
     2. Delegate to `code-auditor` again on the same files
     3. Repeat until approved (max 3 retries per task)
     4. If still failing after 3 retries → stop and show the user the audit report

   **e. Announce completion:**
   ```
   ✓ Task N/M complete (implemented + audited)
   ```

6. **Validation phase — delegate to `orchestrator` agent**

   After ALL tasks are implemented and audited, delegate to the `orchestrator` agent with the change name.

   The orchestrator will:
   - Run `pytest tests/ -v`
   - Run `ruff check src/` and `ruff format --check src/`
   - If all pass → mark tasks `[x]` and return success
   - If anything fails → return failure report WITHOUT fixing

   **Handle orchestrator result:**

   - **If success** → proceed to step 7
   - **If failure:**
     1. Analyze the failure report from the orchestrator
     2. Check against baseline snapshot:
        - If a **pre-existing test** fails → **REGRESSION**. Tell the code-writer: "Test X was passing before your changes and now fails. Fix your source code, do NOT modify the test."
        - If a **new test** fails → tell the code-writer to fix the code (prefer fixing code over test)
     3. Delegate to `code-writer` with the failure context
     4. Delegate to `code-auditor` on the modified files
     5. Loop code-writer↔code-auditor until audit passes
     6. Delegate to `orchestrator` again
     7. Repeat until all tests pass (max 5 total orchestrator attempts)
     8. If still failing after 5 attempts → stop and show the user the full failure report

7. **Show final result**

   **On success:**
   ```
   ## Execution Complete

   **Change:** <name>
   **Progress:** N/N tasks complete

   ### Completed
   - [x] Task 1
   - [x] Task 2
   ...

   **Tests:** passing
   **Ruff:** clean
   **Audit:** all approved

   Files modified:
   - <list of all files changed>

   Next step: /rg:archive to close this change.
   ```

   **On failure (max retries exhausted):**
   Show the error details and ask the user for guidance.

   **On pause (session ending):**
   If Beads active: `bd sync`
   ```
   ## Execution Paused

   **Change:** <name>
   **Progress:** N/M tasks complete

   ### Completed This Session
   - [x] Task 1
   - [x] Task 2

   ### Remaining
   - [ ] Task 3

   Resume with: /rg:execute <name>
   ```

---

## Key Rules

- **YOU orchestrate everything** — you are the session principal. Delegate to agents one at a time.
- **NEVER let agents call other agents** — sub-agents cannot spawn sub-agents in Claude Code.
- **Every code-writer change MUST be audited** — no exceptions, including fixes for test failures.
- **Baseline protection** — pre-existing tests are sacred. If they fail after changes, fix the code, not the tests.
- **Use OpenSpec CLI** for status and instructions — don't guess file locations.
- **Show progress** — announce each task start/completion so the user can follow along.
- **Max retries** — 3 for audit loop per task, 5 for orchestrator validation loop. Then stop and report.
- **NEVER loop indefinitely** — report back and let the user decide.
