---
name: feasibility
description: "Validate a structured User Story (HU) against the real codebase. Reads the HU, analyzes existing code, and produces a feasibility report. If ClickUp MCP is connected, posts the report as a comment and updates the task status automatically."
argument-hint: <path to HU file or ClickUp task URL/ID>
---

Validate a structured HU against the real codebase and produce a feasibility report.

## Pre-flight

- Verify the user provided a path to an HU file, pasted HU text, or a ClickUp task ID/URL. If neither → "Provide the HU file path, paste the HU text, or give me the ClickUp task URL. Example: `/rg:feasibility docs/hu-export-reports.md` or `/rg:feasibility https://app.clickup.com/t/abc123`"
- Check if ClickUp MCP tools are available (try listing tools with `mcp__clickup` prefix). Note availability for Phase 6.

## Instructions

### Phase 1: Read the HU

1. If the user provided a ClickUp task URL or ID → use ClickUp MCP to fetch the task description.
2. If the user provided a file path → read it.
3. If the user pasted text → use that directly.
4. Identify: title, narrative (Como/Quiero/Para), acceptance criteria, data requirements, business rules, and constraints.

### Phase 2: Read Project Context

1. Read `CLAUDE.md` for architecture, stack, patterns, and project-specific rules.
2. Read `openspec/specs/` for existing specifications (if any).
3. Read `pyproject.toml` for project configuration.

### Phase 3: Analyze Codebase

For each component the HU implies, check if it exists:

1. **Models/Tables:** Search `src/models/` — does the table/entity exist? Does it need new fields?
2. **Schemas:** Search `src/schemas/` — do Pydantic schemas exist for the inputs/outputs described?
3. **Services:** Search `src/services/` — is there business logic related to this feature?
4. **Repositories:** Search `src/repositories/` — are there queries related to the entities?
5. **Controllers:** Search `src/controllers/` — is there an endpoint that does something similar?
6. **Handlers:** Search `src/handlers/` — does the Lambda handler exist?
7. **External services:** Check `config.py` and `requirements.txt` — are needed SDKs/APIs already integrated?
8. **Tests:** Check `tests/` — is there existing test coverage for related features?

Use `Grep` and `Glob` extensively. Do NOT guess — verify by reading actual files.

### Phase 4: Estimate Effort

Based on what exists vs what's missing, estimate:

| Category | Time |
|----------|------|
| Endpoint exists, minor change | 1-2 horas |
| New endpoint, existing patterns | medio dia |
| New endpoint + new model/table | 1 dia |
| New service + external integration | 2-3 dias |
| New module/subsystem | 1 semana+ |

Include test writing time (using the red5g flow: /rg:plan generates tests, /rg:execute loops until they pass).

### Phase 5: Sync to ClickUp (if MCP available)

If ClickUp MCP tools are available AND the HU came from a ClickUp task:

1. **Post comment** on the task with:
   ```
   🔍 Feasibility Report

   Verdict: [verdict]
   Esfuerzo estimado: [estimate]
   Componentes existentes: [count]
   Componentes faltantes: [count]
   Riesgos: [count]

   [Si hay preguntas para el PM, listarlas aqui]

   ```

2. **Update task status:**
   - If verdict is ✅ Viable and no questions → move to "Aprobada"
   - If verdict is ⚠️ Viable con condiciones → move to "Preguntas PM"
   - If verdict is ❌ No viable → move to "Preguntas PM"

3. **Add tag:** "hu-revisada-dev"
4. **Remove tag:** "hu-funcional" (if present)

If ClickUp MCP is NOT available:
- Tell the dev: "ClickUp MCP no conectado. Ejecuta: `claude mcp add --transport http clickup https://mcp.clickup.com/mcp` y luego `/mcp` para autenticar. Por ahora, copia el feedback manualmente."

### Phase 6: Present to Dev

```
## 📋 Feasibility Report: <HU title>

Verdict: <verdict>
Effort: <estimate>
Missing: <count> components
Risks: <count>
ClickUp: ✅ Comentario + status actualizado | ⚠️ MCP no conectado

Next:
- ✅ "Plan it" → /rg:plan <n>
- ⚠️ "Needs changes" → waiting for PM response in ClickUp
- ❌ "Not viable" → blockers posted in ClickUp
```

Do NOT proceed to planning. This is validation only.