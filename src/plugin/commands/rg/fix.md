---
name: fix
description: "Quick fix workflow for bugs and small tasks. Investigates briefly, persists findings, then implements with a loop until ruff passes. No planning ceremony needed. For bigger changes, use /rg:explore → /rg:plan → /rg:execute → /rg:archive instead."
argument-hint: <description of the bug or small task>
---

Quick fix workflow — investigate and implement in one command.

## Pre-flight

- Verify `/implement-loop` is available (Essentials plugin). If not → "Install Essentials: `/plugin marketplace add GantisStorm/essentials-claude-code` then `/plugin install essentials@essentials-claude-code`."

## Instructions

### Phase 1: Quick Investigation

1. **Read project context:** Read `CLAUDE.md` for architecture and rules.
2. **Understand the problem:** Read the files related to the user's description. Use `Grep` and `Glob` to find relevant code.
3. **Persist findings:** Write `.claude/fixes/<timestamp>-<short-name>.md` with:

   ```markdown
   # Fix: <short description>

   ## Problem
   <What's broken, in 2-3 sentences>

   ## Files Involved
   - `path/to/file.py` — <why>

   ## Approach
   <What will be changed>
   ```

4. **Brief summary:** In 2-3 sentences, explain what you found and what you'll fix. Do NOT ask for approval — proceed to implementation.

### Phase 2: Implement

1. **Invoke Essentials implement-loop:**
   - Run `/implement-loop` with the fix description and context from Phase 1.
   - Exit criteria: `ruff check src/ && ruff format --check src/`

2. **Quality gate:**
   - After implementation, run the `code-auditor` agent on modified `.py` files.
   - If auditor returns 🔴 Critical → fix before completing.

### Phase 3: Complete

1. **Update fix log:** Append to the fix file created in Phase 1:

   ```markdown
   ## Result
   - Files modified: [list]
   - Auditor: ✅ Approved
   - ruff: ✅ Passing
   ```

2. **Show summary:**

```
## ✅ Fix Applied

- Files modified: [list]
- Auditor: ✅ Approved
- ruff: ✅ Passing
- Log: .claude/fixes/<filename>.md

💡 If this fix changed how something works, consider updating CLAUDE.md.
```

### Escape Hatch

If during investigation you realize this is NOT a small fix:
- STOP implementation.
- Tell the user: "This is bigger than a quick fix. I recommend: /rg:explore → /rg:plan → /rg:execute → /rg:archive"