---
name: "OPSX: Apply"
description: "Implement tasks from an OpenSpec change. Delegates to orchestrator agent which manages code-writers, quality gates, and progress tracking."
category: Workflow
tags: [workflow, artifacts]
---

Implement tasks from an OpenSpec change by delegating to the orchestrator agent.

**Input**: Optionally specify a change name (e.g., `/opsx:apply add-auth`). If omitted, check if it can be inferred from conversation context. If vague or ambiguous you MUST prompt for available changes.

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
   - If `state: "blocked"` (missing artifacts): show message, suggest `/opsx:propose`
   - If `state: "all_done"`: congratulate, suggest `/opsx:archive`
   - Otherwise: proceed

   Check `tests/` for test files. If none → "Run `/opsx:propose` first (which generates tests)."

3. **Delegate to orchestrator agent**

   Pass the change name `<name>` to the `orchestrator` agent.

   The orchestrator will:
   - Read all artifacts from `openspec/changes/<name>/`
   - For each task, delegate to `code-writer` agents to implement
   - Run quality gates after each task (pytest + ruff + code-auditor)
   - Track progress (mark `[x]` in tasks.md, close beads if active)
   - Return a completion summary

   Wait for the orchestrator to complete.

4. **Handle result**

   **On success:**
   ```
   ## Execution Complete

   **Change:** <name>
   [orchestrator summary]

   Next step: /opsx:archive or /rg:archive to close this change.
   ```

   **On failure (orchestrator got stuck):**
   Show the error details from the orchestrator and ask the user for guidance.

   **On pause (session ending):**
   If Beads active: `bd sync`
   ```
   ## Execution Paused

   **Change:** <name>
   [orchestrator progress]

   ### Next Session
   Resume with: /opsx:apply <name> or /rg:execute <name>
   ```
