---
name: "OPSX: Archive"
description: "Archive a completed change — verifies quality gates, syncs specs, and archives."
category: Workflow
tags: [workflow, archive]
---

Archive a completed change. Verifies quality gates before archiving.

**Input**: Optionally specify a change name after `/opsx:archive` (e.g., `/opsx:archive add-auth`). If omitted, check if it can be inferred from conversation context. If vague or ambiguous you MUST prompt for available changes.

**Steps**

1. **If no change name provided, prompt for selection**

   Run `openspec list --json` to get available changes. Use the **AskUserQuestion tool** to let the user select.

   Show only active changes (not already archived).
   Include the schema used for each change if available.

   **IMPORTANT**: Do NOT guess or auto-select a change. Always let the user choose.

2. **Verify quality gates**

   Before archiving, run exit criteria:
   ```bash
   pytest tests/test_controllers/ -v && ruff check src/
   ```

   If either fails → "Tests or ruff failing. Run `/opsx:apply` or `/rg:execute` first."

3. **Check artifact completion status**

   Run `openspec status --change "<name>" --json` to check artifact completion.

   **If any artifacts are not `done`:**
   - Display warning listing incomplete artifacts
   - Prompt user for confirmation to continue
   - Proceed if user confirms

4. **Check task completion status**

   Read the tasks file to check for incomplete tasks.

   Count tasks marked with `- [ ]` (incomplete) vs `- [x]` (complete).

   **If incomplete tasks found:**
   - Display warning showing count
   - Prompt user for confirmation to continue
   - Proceed if user confirms

5. **Assess delta spec sync state**

   Check for delta specs at `openspec/changes/<name>/specs/`. If none exist, proceed without sync prompt.

   **If delta specs exist:**
   - Compare each delta spec with its corresponding main spec at `openspec/specs/<capability>/spec.md`
   - Determine what changes would be applied (adds, modifications, removals, renames)
   - Show a combined summary before prompting

   **Prompt options:**
   - If changes needed: "Sync now (recommended)", "Archive without syncing"
   - If already synced: "Archive now", "Cancel"

   If user chooses sync:
   - **New spec:** Create `openspec/specs/<capability>/spec.md`
   - **Existing spec:** Merge — add new requirements, update modified, remove deprecated
   - Show: "Synced N specs (X new, Y updated)"

6. **Close Beads (optional)**

   If `bd` command is available and `.beads/` exists:
   - Find open beads with label `openspec:<change-name>`: `bd list -l "openspec:<change-name>" --status open --json`
   - Close any remaining open beads: `bd close <id> --reason "Archived with change" --json`
   - Sync: `bd sync`

7. **Perform the archive**

   ```bash
   mkdir -p openspec/changes/archive
   mv openspec/changes/<name> openspec/changes/archive/$(date +%Y-%m-%d)-<name>
   ```

8. **Display summary**

   ```
   ## Archive Complete

   **Change:** <change-name>
   **Archived to:** openspec/changes/archive/YYYY-MM-DD-<name>/
   **Specs:** Synced N to openspec/specs/ (X new, Y updated) | No delta specs | Sync skipped
   **Beads:** N closed (or "not active")
   **Tests:** passing
   **ruff:** passing

   Update CLAUDE.md "Notes for AI" if this changed how the project works.
   ```

**Guardrails**
- Always prompt for change selection if not provided
- **Always verify pytest + ruff before archiving** (this is the red5g quality gate — OpenSpec original does not enforce this)
- Use artifact graph (openspec status --json) for completion checking
- Don't block archive on warnings - just inform and confirm
- Show clear summary of what happened
- If delta specs exist, always run the sync assessment and show the combined summary before prompting
