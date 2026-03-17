# red5g-essentials

Plugin empresarial de estándares para backends Python serverless en AWS.

## Qué Incluye

| Componente | Propósito |
|-----------|---------|
| `agents/code-auditor.md` | Auditor de calidad con 7 pilares (KISS, SOLID, PEP 8, Docstrings, Seguridad, Guard Clauses, Error Handling) |
| `agents/git-flow.md` | Automatización de Git Flow (branching, merging, releases, PRs) |
| `skills/python-standards.md` | Reglas globales de código, se activa automáticamente en todo `.py` |
| `skills/workflow-guide.md` | Guía de flujos de trabajo: OpenSpec + Essentials + Beads |
| `hooks/ruff-gate.py` | Hook PostToolUse que bloquea escritura si ruff check/format falla |
| `commands/audit.md` | `/audit` — ejecuta code-auditor sobre archivos modificados |
| `commands/apply-audited.md` | `/apply-audited` — OpenSpec apply con auditoría obligatoria por tarea |
| `commands/plan-from-spec.md` | `/plan-from-spec` — detecta el cambio activo de OpenSpec y genera plan Essentials automáticamente |
| `scripts/setup.sh` | Inicialización de proyecto nuevo con un solo comando |

## Instalación

### Plugins requeridos (una vez por desarrollador)
```bash
# Dentro de Claude Code — ejecutar una sola vez:

# 1. Plugin de la empresa (agentes, skills, hooks)
/plugin marketplace add angulojd/red5g-essentials
/plugin install red5g

# 2. Plugin de ejecución (loops, swarms, teams con exit criteria)
/plugin marketplace add GantisStorm/essentials-claude-code
/plugin install essentials@essentials-claude-code
```

> Sin Essentials instalado, los comandos `/implement-loop`, `/plan-creator`, `/plan-loop`, `/plan-swarm`, `/plan-team`, `/beads-converter` y `/beads-loop` no estarán disponibles.

### Proyecto nuevo
```bash
mkdir mi-proyecto && cd mi-proyecto
git init

# Solo CLAUDE.md + configs
curl -fsSL https://raw.githubusercontent.com/angulojd/red5g-essentials/main/scripts/setup.sh | bash -s -- --template backend-mysql

# Con estructura de carpetas completa
curl -fsSL https://raw.githubusercontent.com/angulojd/red5g-essentials/main/scripts/setup.sh | bash -s -- --template backend-mysql --scaffold
```

### Templates disponibles

| Template | Stack |
|----------|-------|
| `backend-mysql` | Python 3.13 + Serverless Framework v3 + AWS Lambda + MySQL + SQLAlchemy ORM |
| `generic` | Template vacío para llenar manualmente |

### Flags

| Flag | Descripción |
|------|-------------|
| `--template <nombre>` | Selecciona el template de CLAUDE.md (default: `generic`) |
| `--scaffold` | Crea la estructura de carpetas con archivos base (solo `backend-mysql`) |

### Qué crea el scaffold
```
src/
├── config.py              # pydantic-settings (Secrets Manager → env vars)
├── database.py            # SQLAlchemy ORM engine + session
├── handlers/              # Entry points de Lambda (máx 5 líneas)
├── controllers/           # Lógica de API con @handle_exceptions
├── services/              # Lógica de negocio
├── repositories/          # Queries SQLAlchemy
├── models/                # Modelos SQLAlchemy ORM (tablas)
├── schemas/               # Schemas Pydantic v2 (validación API)
├── utils/
│   ├── logger.py          # Logging estructurado para CloudWatch
│   └── decorators.py      # @handle_exceptions
└── exceptions/
    └── domain.py          # NotFoundError, ValidationError, etc.
tests/
├── test_handlers/
├── test_services/
└── test_repositories/
.env.example               # Variables de entorno para desarrollo local
```

## Arquitectura
```
API Gateway
    ↓
Handler (parseo + delegación, máx 5 líneas, sin try/except)
    ↓
@handle_exceptions
Controller (orquesta services, retorna respuesta)
    ↓
Service (lógica de negocio)
    ↓
Repository (queries SQLAlchemy)
    ↓
Model (SQLAlchemy ORM)     Schema (Pydantic v2 API)
```

## Flujos de Trabajo

### Fix / Tarea pequeña (sin planificación)
```
/implement-loop <descripción de la tarea>
```

Si necesitas investigar primero:
```
/opsx:explore
/implement-loop <fix basado en lo que encontramos>
```

### Feature (necesita planificación arquitectónica)
```
/opsx:explore                          # Investiga el problema
/opsx:propose <nombre>                 # OpenSpec genera proposal, specs, design, tasks
/plan-from-spec                        # Auto-detecta el cambio de OpenSpec, genera plan Essentials
/plan-loop .claude/plans/<plan>.md     # Ejecuta con exit criteria (auditor se invoca por tarea)
/opsx:archive                          # Archiva las specs
```

Para ejecución paralela usa `/plan-swarm` en vez de `/plan-loop`.
Para builds multi-componente usa `/plan-team` en vez de `/plan-loop`.

### Feature multi-sesión (>1 día)
```
/opsx:explore                              # Investiga
/opsx:propose <nombre>                     # OpenSpec planifica
/plan-from-spec                            # Genera plan Essentials desde OpenSpec
/beads-converter .claude/plans/<plan>.md   # Convierte a Beads para persistencia
/beads-loop                                # Ejecuta con persistencia
/opsx:archive                              # Archiva al completar
```

Si la sesión se interrumpe, `bd ready` muestra dónde quedaste.

### Referencia rápida

| Situación | Flujo |
|-----------|-------|
| Fix rápido, contexto claro | `/implement-loop` |
| Fix que necesita investigar | `/opsx:explore` → `/implement-loop` |
| Feature con planificación | `/opsx:explore` → `/opsx:propose` → `/plan-from-spec` → `/plan-loop` → `/opsx:archive` |
| Feature >1 sesión | Igual pero `/beads-converter` → `/beads-loop` en vez de `/plan-loop` |
| Tareas paralelas independientes | `/plan-swarm` o `/beads-swarm` en vez de loop |
| Build multi-componente | `/plan-team` en vez de loop |

### Auditoría manual
```
/audit src/services/auth.py      # archivo específico
/audit src/services/             # carpeta completa
/audit                           # archivos .py modificados en git
```

## Estándares Enforceados

### Código
- **PEP 8** con line-length configurable (lee pyproject.toml, default 100)
- **Tipado estricto** en todas las funciones (parámetros + retorno)
- **Pydantic v2** para validación de API, **SQLAlchemy ORM** para base de datos
- **pydantic-settings** para configuración (credenciales via Secrets Manager → SSM → env vars)
- **Código en inglés** / **Docstrings en español** / **Logs en español**

### Arquitectura
- **Handler → Controller → Service → Repository** (cadena estricta)
- **Handlers** máximo 5 líneas, sin try/except
- **Controllers** siempre con `@handle_exceptions`
- **SOLID**: responsabilidad única, Open/Closed, inversión de dependencias
- **Guard clauses** sobre if/else anidados
- **100 líneas máx** por función, **400 máx** por archivo

### Seguridad
- Cero credenciales hardcodeadas
- Prohibido `os.environ` / `os.getenv` fuera de config.py
- Prohibido `print()` en producción (usar `logger`)
- Logging estructurado con contexto (request_id, user_id)
- Excepciones específicas, prohibido `except: pass`

### Git
- **Conventional Commits**: `feat(scope):`, `fix(scope):`, etc.
- **Git Flow**: feature/*, release/*, hotfix/*

## Credenciales

Las credenciales van en AWS Secrets Manager, referenciadas via SSM en `serverless.yml`:
```yaml
provider:
  environment:
    DB_HOST: ${ssm:/aws/reference/secretsmanager/${env:SECRET_NAME}~true}
```

En código, `config.py` las lee como variables de entorno via pydantic-settings. NUNCA llamar a Secrets Manager directamente en runtime.

## Después de Cada Feature Importante

Actualiza la sección "Notes for AI" del `CLAUDE.md` del proyecto con decisiones arquitectónicas que futuras sesiones deben conocer (ej: "Usar SDK X, nunca llamadas HTTP directas").

## Requisitos

| Herramienta | ¿Requerida? | Propósito |
|-------------|-------------|-----------|
| ruff | Sí | Linting + formateo (hook bloqueante) |
| Essentials plugin | Sí | Loops, swarms, teams con exit criteria |
| OpenSpec | Recomendada | Planificación arquitectónica con specs |
| Beads | Opcional | Memoria persistente entre sesiones |
| tmux | Opcional | Solo para modo `/plan-team` |

## Actualizar
```bash
# Dentro de Claude Code:
/plugin marketplace update
/plugin update red5g
```

## Licencia

MIT