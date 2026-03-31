---
name: plan
description: "Propose a new change - create it and generate all artifacts in one step, then generate an executable plan and tests."
category: Workflow
tags: [workflow, planning, artifacts, experimental]
---

Propose a new change - create the change and generate all artifacts in one step.

I'll create a change with artifacts:
- proposal.md (what & why)
- specs/ (requirements with WHEN/THEN scenarios)
- design.md (how)
- tasks.md (implementation steps)
- tests (via `test-generator` agent)

---

**Input**: The argument is the change name (kebab-case), OR a description of what the user wants to build.

**Steps**

1. **If no input provided, ask what they want to build**

   Use the **AskUserQuestion tool** (open-ended, no preset options) to ask:
   > "What change do you want to work on? Describe what you want to build or fix."

   From their description, derive a kebab-case name (e.g., "add user authentication" → `add-user-auth`).

   **IMPORTANT**: Do NOT proceed without understanding what the user wants to build.

2. **Read project context**

   - Read `CLAUDE.md` for architecture and rules
   - Read `openspec/specs/` for existing canonical specifications
   - Read `pyproject.toml` for project configuration
   - Check `openspec/changes/` for existing changes with `feasibility.md` — if found, read it for prior context

3. **Create the change directory**
   ```bash
   openspec new change "<name>"
   ```
   This creates a scaffolded change at `openspec/changes/<name>/` with `.openspec.yaml`.

4. **Get the artifact build order**
   ```bash
   openspec status --change "<name>" --json
   ```
   Parse the JSON to get:
   - `applyRequires`: array of artifact IDs needed before implementation
   - `artifacts`: list of all artifacts with their status and dependencies

5. **Create artifacts in sequence until apply-ready**

   Loop through artifacts in dependency order (artifacts with no pending dependencies first):

   a. **For each artifact that is `ready` (dependencies satisfied)**:
      - Get instructions:
        ```bash
        openspec instructions <artifact-id> --change "<name>" --json
        ```
      - The instructions JSON includes:
        - `context`: Project background (constraints for you - do NOT include in output)
        - `rules`: Artifact-specific rules (constraints for you - do NOT include in output)
        - `template`: The structure to use for your output file
        - `instruction`: Schema-specific guidance for this artifact type
        - `outputPath`: Where to write the artifact
        - `dependencies`: Completed artifacts to read for context
      - Read any completed dependency files for context
      - Create the artifact file using `template` as the structure
      - Apply `context` and `rules` as constraints - but do NOT copy them into the file
      - **For design.md specifically:** If the feature involves multiple modules or components that interact (e.g., controllers + services, front + back, multiple endpoints), add a `## Contracts` section at the end of design.md. Contracts define shared interfaces that all modules must respect:
        ```markdown
        ## Contracts

        ### API Response Format
        - Success: { data: T, message: string }
        - Error: { error: string, message: string, status: int }

        ### Auth Token
        - Format: JWT { user_id, role, exp }
        - Header: Authorization: Bearer <token>

        ### Database
        - Models extend Base from src/database.py
        - Tables: snake_case, Models: PascalCase
        ```
        Adapt contracts to the specific project and feature. Include only contracts relevant to this change. If the feature is a single isolated module with no cross-module interactions, skip this section.
      - Show brief progress: "Created <artifact-id>"

   b. **Continue until all `applyRequires` artifacts are complete**
      - After creating each artifact, re-run `openspec status --change "<name>" --json`
      - Check if every artifact ID in `applyRequires` has `status: "done"` in the artifacts array
      - Stop when all `applyRequires` artifacts are done

   c. **If an artifact requires user input** (unclear context):
      - Use **AskUserQuestion tool** to clarify
      - Then continue with creation

6. **Generate tests**

   **Delegate to the `test-generator` agent.** Pass it the change name `<name>`. Do NOT generate tests yourself.

   The agent will:
   - Read all artifacts from `openspec/changes/<name>/`
   - Read existing code patterns
   - Generate pytest tests based on spec WHEN/THEN scenarios
   - Write to `tests/` (typically `tests/test_controllers/`, `tests/test_services/`)

   Wait for the agent to complete.

7. **Create Beads for persistent tracking (optional)**

   Check if `bd` command is available and `.beads/` directory exists. If not, skip silently.

   If available:

   a. **Create epic** for the change:
      ```bash
      bd create "<change-name>" -t epic -p 1 -l "openspec:<change-name>" -d "## OpenSpec Change
      Proposal: openspec/changes/<name>/proposal.md
      Specs: openspec/changes/<name>/specs/" --json
      ```

   b. **For each task in tasks.md**, create a child bead with FULL self-contained context:
      ```bash
      bd create "<task-description>" -t task -p 2 \
        -l "openspec:<change-name>" \
        -d "## Spec Reference
      openspec/changes/<name>/specs/<capability>/spec.md

      ## Requirements
      - <copy key requirements from spec>

      ## Acceptance Criteria
      - <from spec WHEN/THEN scenarios>

      ## Files to Modify
      - <from design.md decisions and specs>

      ## Technical Context
      - <from design.md decisions>" --json
      ```

   c. **Add dependencies** between beads matching task order from tasks.md:
      ```bash
      bd dep add <child-id> <parent-id>
      ```

   d. **Sync**: `bd sync`

   **CRITICAL**: Each bead description must be self-contained — an agent must be able to implement the task with ONLY the bead description + codebase access. Never create beads without `-d`.

8. **Show final status**
   ```bash
   openspec status --change "<name>"
   ```

**Output**

After completing everything, summarize:
- Change name and location
- List of artifacts created (proposal, specs, design, tasks)
- Tests generated with count
- Beads created: N tasks under epic (or "Beads not active")
- Prompt: "Review the artifacts and tests. When approved, run `/rg:execute` to start implementing."

**STOP HERE.** Do NOT proceed to implementation. Wait for the user to review and approve.

**Guardrails**
- Create ALL artifacts needed for implementation (as defined by schema's `apply.requires`)
- Always read dependency artifacts before creating a new one
- If context is critically unclear, ask the user - but prefer making reasonable decisions to keep momentum
- If a change with that name already exists, ask if user wants to continue it or create a new one
- Verify each artifact file exists after writing before proceeding to next
- `context` and `rules` from OpenSpec instructions are constraints for YOU, not content for the artifact files
