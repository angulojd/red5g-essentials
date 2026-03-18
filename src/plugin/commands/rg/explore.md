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

2. **Execute OpenSpec explore:**
   - Run the OpenSpec explore workflow: invoke `/opsx:explore` with the user's description.
   - Let it investigate the codebase, identify relevant files, and understand the problem space.

3. **Summarize findings to the user:**
   - What files are involved
   - What the current behavior is
   - What needs to change
   - Any risks or dependencies discovered

4. **Persist findings to disk:**
   - Determine a short kebab-case name for this exploration (e.g., `user-auth`, `fix-payment-timeout`).
   - Create directory `openspec/changes/<name>/` if it doesn't exist yet.
   - Write `openspec/changes/<name>/exploration.md` with the following structure:

   ```markdown
   # Exploration: <name>

   ## Problem
   <What the user wants to investigate, in 2-3 sentences>

   ## Files Involved
   - `path/to/file.py` — <why it's relevant>
   - `path/to/other.py` — <why it's relevant>

   ## Current Behavior
   <How it works today>

   ## What Needs to Change
   <High-level approach, NOT implementation details>

   ## Risks & Dependencies
   - <Risk or dependency discovered>
   ```

   - Tell the user: "Findings saved to `openspec/changes/<name>/exploration.md`."

5. **Ask the user:** "Ready to plan this? Use `/rg:plan <name>` to create the full plan with specs and tests."

Do NOT implement anything. This is investigation only.