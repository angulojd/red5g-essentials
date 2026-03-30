# @red5g/cli

CLI para instalar y configurar el flujo de trabajo **red5g** para Claude Code.

Integra **OpenSpec** (planificación spec-driven) + **auditor de calidad** + **ruff** + **quality gates** + **ClickUp MCP** en 7 comandos simples.

## Guía de instalación paso a paso

Si ya tienes todo instalado, salta a [Instalación rápida](#instalación-rápida).

### 1. Requisitos previos

Instala Node.js (v20.19+) y Python 3 si no los tienes:

```bash
# macOS con Homebrew
brew install node python3

# Verificar versiones
node -v   # debe ser ≥20.19
python3 --version
```

> En Linux usa tu gestor de paquetes. En Windows usa [nvm-windows](https://github.com/coreybutler/nvm-windows) y [python.org](https://www.python.org/downloads/).

### 2. Instalar Claude Code

```bash
npm install -g @anthropic-ai/claude-code
```

Ejecuta `claude` y sigue las instrucciones de autenticación.

### 3. Instalar herramientas globales

El CLI las instala automáticamente durante `init`, pero si prefieres hacerlo manualmente:

```bash
# OpenSpec — planificación spec-driven (requerido)
npm install -g @fission-ai/openspec@latest

# ruff — linter y formatter de Python (requerido)
curl -LsSf https://astral.sh/ruff/install.sh | sh

# Beads — memoria persistente entre sesiones (opcional, incluye Dolt embedded)
npm install -g @beads/bd
```

### 4. Crear el proyecto

```bash
mkdir mi-proyecto && cd mi-proyecto
git init
npx @red5g/cli init
```

El asistente te preguntará qué template usar y si quieres scaffold.

### 5. Verificar el entorno

```bash
npx @red5g/cli doctor
```

### 6. Listo — usa el workflow

Dentro de Claude Code:

```
/rg:explore <qué investigar>     # Investigar el codebase
/rg:plan <nombre del feature>    # Crear plan de implementación
/rg:execute                      # Ejecutar (loop hasta que pase pytest + ruff)
/rg:archive                      # Archivar cambio completado
```

---

## Instalación rápida

Si ya tienes Node.js ≥20.19, Python 3 y Claude Code:

```bash
mkdir mi-proyecto && cd mi-proyecto
npx @red5g/cli init --template backend-mysql --scaffold
```

## Qué instala

| Componente | Qué hace |
|------------|----------|
| **OpenSpec** | Planificación spec-driven (`openspec/specs/`, `openspec/changes/`) |
| **ruff** | Linter + formatter de Python (hook bloqueante) |
| **Beads** | Memoria persistente entre sesiones (opcional) |
| **Plugin red5g** | 11 commands + 5 agents + 2 skills + 1 hook en `.claude/` |
| **ClickUp MCP** | Conexión directa a ClickUp para leer/escribir tareas (`.mcp.json`) |
| **CLAUDE.md** | Guía del proyecto para Claude Code |
| **Scaffold** | Estructura de carpetas con archivos base (opcional) |

## Comandos del CLI

### `red5g init`

```bash
npx @red5g/cli init                              # Interactivo
npx @red5g/cli init --template backend-mysql -s   # Directo con scaffold
npx @red5g/cli init -t backend-mysql -s -y        # Sin preguntas
npx @red5g/cli init --skip-tools                  # Sin instalar herramientas
```

### `red5g doctor`

```bash
npx @red5g/cli doctor
```

### `red5g update`

```bash
npx @red5g/cli update        # Actualiza commands/agents/skills/hooks
npx @red5g/cli update --force # Sin preguntar
```

## Flujo de trabajo

**Siempre empezar con explore.** Explore investiga y recomienda el siguiente paso.

```
/rg:explore <descripción>        # Investiga → recomienda fix o plan
```

### Si explore recomienda fix (cambio pequeño)

```
/rg:fix <nombre>                 # OpenSpec ligero + orchestrator + archive
                                 # Todo en un comando, spec persiste
```

### Si explore recomienda plan (feature grande)

```
/rg:plan <nombre del feature>    # Crea artefactos OpenSpec + genera tests
                                 # PAUSA — revisar y aprobar
/rg:execute                      # Orchestrator implementa con quality gates
/rg:archive                      # Sincroniza specs, archiva cambio
```

### Con HU del PM

```
/rg:feasibility <hu.md o URL>    # Valida HU contra codebase real
/rg:explore <descripción>        # Investiga → recomienda fix o plan
... luego fix o plan según tamaño
```

### Auditoría manual

```
/rg:audit src/services/          # Delega al agente code-auditor
```

### Qué orquesta cada comando

| Comando | Por debajo |
|---------|-----------|
| `/rg:explore` | Modo pensamiento — investiga codebase, visualiza, recomienda fix o plan |
| `/rg:fix` | OpenSpec ligero (proposal + spec + tasks) → `orchestrator` → `code-writer` + quality gates → archive con spec persistente |
| `/rg:plan` | OpenSpec crea change → sesión principal genera artefactos → `test-generator` → crea beads (opcional) → pausa para aprobación |
| `/rg:execute` | Delega a `orchestrator` → `code-writer` por tarea → pytest + ruff + `code-auditor` por tarea |
| `/rg:archive` | Verifica quality gates → sincroniza specs a `openspec/specs/` → cierra beads → archiva |
| `/rg:feasibility` | Lee HU + analiza codebase → genera reporte → postea en ClickUp |
| `/rg:audit` | Delega al agente `code-auditor` |

### Agentes

| Agente | Rol |
|--------|-----|
| `orchestrator` | Orquesta ejecución: lee tasks, delega a code-writers, corre quality gates |
| `code-writer` | Implementa una tarea específica (recibe contexto, escribe código) |
| `test-generator` | Genera pytest tests desde specs WHEN/THEN |
| `code-auditor` | Audita calidad Python (7 pilares) |
| `git-flow` | Automatiza Git Flow (branching, merging, releases) |

### Equivalencias con OpenSpec

Los comandos `/rg:*` tienen equivalentes `/opsx:*` que hacen exactamente lo mismo:

| red5g | OpenSpec | Nota |
|-------|---------|------|
| `/rg:explore` | `/opsx:explore` | Idénticos |
| `/rg:plan` | `/opsx:propose` | Idénticos |
| `/rg:execute` | `/opsx:apply` | Idénticos |
| `/rg:archive` | `/opsx:archive` | Idénticos |
| `/rg:fix` | — | Solo en red5g |
| `/rg:feasibility` | — | Solo en red5g |
| `/rg:audit` | — | Solo en red5g |

## Templates

| Template | Stack |
|----------|-------|
| `backend-mysql` | Python 3.13 + Serverless Framework v3 + AWS Lambda + MySQL + SQLAlchemy ORM |
| `generic` | Template vacío para configurar manualmente |

## Requisitos

| Herramienta | ¿Requerida? | Se instala automáticamente |
|-------------|-------------|---------------------------|
| Node.js ≥20.19 | Sí | No |
| git | Sí | No |
| Claude Code | Sí | No |
| OpenSpec | Sí | Sí |
| ruff | Sí | Sí |
| Beads | Opcional | Sí |

## Licencia

MIT
