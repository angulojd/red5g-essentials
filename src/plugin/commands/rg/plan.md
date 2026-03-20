---
name: plan
description: "Full planning pipeline: creates OpenSpec proposal with specs, generates an Essentials plan with dependency graph and exit criteria, and generates pytest tests for controllers. Requires /rg:explore or /rg:feasibility first. Pauses for user approval of tests before proceeding to /rg:execute."
argument-hint: <feature name or description>
---

Full planning pipeline. Orchestrates OpenSpec + Essentials + test generation in one command.

## Pre-flight

- Verify `openspec/` directory exists. If not → "Run `openspec init --tools claude` first."
- Verify `/plan-creator` is available (Essentials plugin). If not → "Install Essentials: `/plugin marketplace add GantisStorm/essentials-claude-code` then `/plugin install essentials@essentials-claude-code`."
- Verify that `/rg:explore` or `/rg:feasibility` was run first. If the user hasn't done either → "Run `/rg:explore <description>` or `/rg:feasibility <hu-file>` first."

## Instructions

### Phase 1: OpenSpec Proposal (MANDATORY)

1. You MUST invoke `/opsx:propose` with the user's feature name/description. Include key findings from the prior context. This step is non-negotiable — do NOT skip it, create the artifacts yourself, or substitute it with manual file creation.
2. `/opsx:propose` is responsible for generating: `proposal.md`, `specs/`, `design.md`, `tasks.md` in `openspec/changes/<n>/`. Wait for it to complete.
3. Show the user a brief summary of what was proposed.

### Phase 2: Essentials Plan

1. Read all artifacts from `openspec/changes/<n>/`:
   - `proposal.md`
   - `tasks.md`
   - All files in `specs/` (if exists)
   - `design.md` (if exists)

2. Invoke `/plan-creator` passing ALL the context read above. The prompt should be:
   "Implement the OpenSpec change '<n>'. Here is the full context:" followed by all artifacts.

3. The plan will be created in `.claude/plans/` with Dependency Graph and exit criteria.

### Phase 3: Generate Tests (Delegated)

**Delegate to the `test-generator` agent.** Do NOT generate tests yourself.

The agent runs with its own context window, reads specs and plan from disk, generates pytest controller tests, and writes them to `tests/test_controllers/`.

Wait for the agent to complete and return its summary.

### Phase 4: Present for Approval

Show the user a summary:

```
## 📋 Plan Summary

### OpenSpec Change: <n>
- Proposal: openspec/changes/<n>/proposal.md
- Specs: X spec files

### Essentials Plan: .claude/plans/<plan-file>.md
- Tasks: X tasks in Y phases
- Dependencies: [brief graph]
- Exit criteria: pytest tests/test_controllers/ -v && ruff check src/

### Tests Generated: tests/test_controllers/
- test_<module>.py: X tests (happy path, validation, not found, etc.)

Review the tests in tests/test_controllers/ and let me know:
- ✅ "Approved" → run /rg:execute to start implementation
- ✏️ Request changes → I'll update the tests
- ❌ "Redo" → I'll regenerate from scratch
```

**STOP HERE.** Do NOT proceed to implementation. Wait for the user to review and approve.