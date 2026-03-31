---
name: fix
description: "Quick fix for bugs and small tasks. Evaluates complexity, implements via code-writer, audits, and validates with pytest + ruff. No OpenSpec artifacts — investigation should already be done via /rg:explore."
argument-hint: <description of the bug or small task>
category: Workflow
tags: [workflow, fix, bugfix]
---

Quick fix — evaluate, implement, validate. Investigation should already be done via `/rg:explore`.

**Input**: Description of the bug or what to fix. Uses conversation context from prior `/rg:explore` if available.

---

## Steps

### 1. Evaluate Complexity

Before touching any code, evaluate if this is really a fix:

- **More than 3 files** need modification?
- **Architecture changes** — new modules, changed interfaces, new dependencies?
- **New tests required** — not just existing tests passing, but new test scenarios?

**If ANY of these apply → STOP.** Tell the user:
> "This is bigger than a quick fix. I recommend: `/rg:explore` → `/rg:plan` → `/rg:execute` → `/rg:archive`"

If none apply → proceed.

### 2. Snapshot Test Baseline

```bash
pytest tests/ -v --tb=no -q 2>&1
```

Record which tests pass and which already fail. This is the **baseline** — only NEW failures after the fix are regressions.

### 3. Implement — delegate to `code-writer`

Pass the code-writer:
- What to fix (from user description + conversation context)
- Files to modify
- Existing code patterns (read the files first)

Wait for the code-writer to return.

### 4. Audit — delegate to `code-auditor`

Pass the code-auditor the files the code-writer modified.

**Handle audit result:**
- **Approved** → continue to step 5
- **Critical issues:**
  1. Delegate to `code-writer` with the audit report
  2. Delegate to `code-auditor` again
  3. Max 3 retries — if still failing, stop and show the user

### 5. Validate

```bash
pytest tests/ -v && ruff check src/ && ruff format --check src/
```

**Compare against baseline:**
- Test was **already failing** before → ignore (not our problem)
- Test was **passing before** and now fails → **regression**, must fix:
  1. Delegate to `code-writer` — "Test X was passing before your fix and now fails. Fix your code, do NOT modify the test."
  2. Delegate to `code-auditor` on the modified files
  3. Run pytest + ruff again
  4. Max 3 retries — if still failing, stop and show the user

### 6. Done

```
## Fix Applied

**Files modified:**
- <list>

**Tests:** passing (no regressions)
**Ruff:** clean
**Audit:** approved
```

---

## Key Rules

- **No OpenSpec, no artifacts, no tasks** — this is a quick fix, not a feature
- **Investigation happens in `/rg:explore`** — fix just applies the correction
- **Complexity gate is mandatory** — if it's too big, redirect to the full flow
- **Baseline protection** — never blame a test that was already failing
- **Every code-writer change gets audited** — no exceptions
- **NEVER loop indefinitely** — max 3 retries, then report to user
