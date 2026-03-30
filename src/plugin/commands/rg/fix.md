---
name: fix
description: "Quick fix workflow for bugs and small tasks. Investigates, creates a lightweight OpenSpec change using the CLI, implements via orchestrator, and archives. The fix spec lives permanently in openspec/specs/ for future reference."
argument-hint: <description of the bug or small task>
category: Workflow
tags: [workflow, fix, bugfix]
---

Quick fix workflow — investigate, document, implement, archive. All in one command, but with specs that persist for future reference.

**Input**: Description of the bug or small task.

---

## Steps

### 1. Quick Investigation

1. **Read project context:** Read `CLAUDE.md` for architecture and rules.
2. **Check existing specs:** Run `openspec list --json` and scan `openspec/specs/` — the bug might relate to an existing capability.
3. **Understand the problem:** Read the files related to the user's description. Use `Grep` and `Glob` to find relevant code.
4. **Brief summary:** In 2-3 sentences, explain what you found and what you'll fix.

### Escape Hatch

If during investigation you realize this is NOT a small fix:
- STOP.
- Tell the user: "This is bigger than a quick fix. I recommend: /rg:explore → /rg:plan → /rg:execute → /rg:archive"

### 2. Create lightweight OpenSpec change

Derive a kebab-case name from the description (e.g., "fix-login-timeout", "fix-null-pointer-export").

```bash
openspec new change "fix-<name>"
```

Get the artifact build order:
```bash
openspec status --change "fix-<name>" --json
```

Create artifacts in dependency order — for each artifact that is `ready`:
```bash
openspec instructions <artifact-id> --change "fix-<name>" --json
```

Use the instructions `template` as structure. Keep artifacts **lightweight** — this is a fix, not a full feature:

- **`proposal.md`** — Brief: what's broken (2-3 sentences), what will be fixed, files involved
- **`specs/<area>/spec.md`** — Document the CORRECT behavior with WHEN/THEN scenarios. Always include a regression guard scenario.
- **`tasks.md`** — Usually 1-2 tasks: the fix itself + update/add tests

After creating each artifact, verify status:
```bash
openspec status --change "fix-<name>" --json
```

Continue until all `applyRequires` artifacts have `status: "done"`.

**IMPORTANT**: `context` and `rules` from OpenSpec instructions are constraints for YOU, not content for the artifact files.

### 3. Implement

**Delegate to the `orchestrator` agent.** Pass it the change name `fix-<name>`.

The orchestrator will:
- Read the artifacts via `openspec instructions apply`
- Delegate to `code-writer` for each task
- Run quality gates (pytest + ruff + code-auditor)
- Mark tasks `[x]`

Wait for the orchestrator to complete.

### 4. Archive

On success, archive the fix so the spec persists:

```bash
openspec status --change "fix-<name>" --json
```

If all tasks complete:
- Sync delta specs to `openspec/specs/` (the fix spec lives permanently for future reference)
- If Beads active: close any beads + `bd sync`
- Archive:
  ```bash
  mkdir -p openspec/changes/archive
  mv openspec/changes/fix-<name> openspec/changes/archive/$(date +%Y-%m-%d)-fix-<name>
  ```

### 5. Summary

```
## Fix Applied

**Change:** fix-<name>
**Archived to:** openspec/changes/archive/YYYY-MM-DD-fix-<name>/
**Spec persisted:** openspec/specs/<area>/spec.md
**Files modified:** [list]
**Tests:** passing
**ruff:** passing
**Auditor:** approved
```

---

## Guardrails

- Keep artifacts lightweight — this is a fix, not a full feature
- Use the OpenSpec CLI for artifact creation (same flow as `/rg:plan`)
- The spec should document the CORRECT behavior, not the bug
- Always include a regression guard scenario in the spec
- Escape to the full flow if the fix is bigger than expected
- Specs persist after archive → future sessions know the intended behavior
