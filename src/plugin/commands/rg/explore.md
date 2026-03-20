---
name: explore
description: "Investigate a problem before committing to a solution. Reads the codebase, understands the context, and discusses the approach. Persists findings to disk for /rg:plan to consume. Use this as the first step before planning any feature or fix."
argument-hint: <what you want to investigate>
---

Investigate the problem described by the user before committing to any solution.

## Pre-flight

- Verify `openspec/` directory exists. If not, tell the user: "OpenSpec not initialized. Run `openspec init --tools claude` first, or `npx @red5g/cli init` to set up everything."

## Instructions

1. **Read project context:**
   - Read `CLAUDE.md` for architecture and rules.
   - Read `openspec/specs/` for existing specifications (if any).

2. **Execute OpenSpec explore (MANDATORY):**
   - You MUST invoke `/opsx:explore` with the user's description. This step is non-negotiable — do NOT skip it, summarize on your own, or substitute it with manual file reads.
   - Wait for `/opsx:explore` to complete before proceeding to the next step.

3. **Summarize findings to the user:**
   - What files are involved
   - What the current behavior is
   - What needs to change
   - Any risks or dependencies discovered

4. **Ask the user:** "Ready to plan this? Use `/rg:plan <name>` to create the full plan with specs and tests."

Do NOT implement anything. This is investigation only.