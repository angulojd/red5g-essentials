---
name: plan-from-spec
description: "Automatically read the active OpenSpec change and generate an Essentials plan with exit criteria. No need to specify paths — it detects the active change automatically."
---

Generate an Essentials plan from the current active OpenSpec change.

## Instructions

1. **Find the active OpenSpec change:**
   - Run `openspec list --json` to get all active changes.
   - If there is exactly 1 active change, use it.
   - If there are multiple, ask the user which one to use.
   - If there are none, tell the user to run `/opsx:propose` first.

2. **Read the OpenSpec artifacts:**
   - Read `openspec/changes/<change-name>/proposal.md`
   - Read `openspec/changes/<change-name>/tasks.md`
   - Read all files in `openspec/changes/<change-name>/specs/` (if exists)
   - Read `openspec/changes/<change-name>/design.md` (if exists)

3. **Generate the Essentials plan:**
   - Use `/plan-creator` passing ALL the context you just read.
   - The prompt to plan-creator should be:
     "Implement the OpenSpec change '<change-name>'. Here is the full context:"
     followed by the content of proposal, specs, design, and tasks.

4. **Output:** The plan will be created in `.claude/plans/` with Dependency Graph and exit criteria, ready for `/plan-loop` or `/plan-swarm`.