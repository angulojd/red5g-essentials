<!-- red5g:template:quuo -->
# 🤖 Guía de desarrollo — [NOMBRE DEL REPO]

> **EDITA ESTE ARCHIVO** con la información específica del repo de lógica.
> Las reglas obligatorias del stack Quuo 3 viven en
> `.claude/skills/quuo3-dev/SKILL.md` (auto-activable).
> Las reglas de Python (PEP 8, typing, seguridad) en
> `.claude/skills/python-standards/SKILL.md`.

## Stack

- Python 3.12 · Serverless Framework v3 · AWS Lambda · API Gateway · RDS MySQL
- ORM: SQLAlchemy (solo construcción de queries) + pymysql (ejecución vía `conn`)
- Auth: Cognito + decoradores `@authorized` / `@multi_source` (`quuo-auth`)
- Modelos: `quuo-models` (repo externo, **solo lectura**)

## Arquitectura del repo

```
Classes/      # Clases de lógica de negocio (PascalCase.py)
handlers/     # Solo handlers — sin lógica (PascalCaseHandler.py)
Helpers/      # Funciones auxiliares reutilizables (opcional, vacío por defecto)
schemas/      # Esquemas de validación (opcional, vacío por defecto)
requirements/ # dev.in + lock.in + requirements-{dev,git,lock}.txt + readme.txt
tests/        # pytest (no es estándar Quuo, pero red5g lo añade)
```

> El handler **nunca** contiene lógica. Solo importa la clase, instancia con
> `conn` y delega al método correspondiente. Ver `.claude/skills/quuo3-dev/SKILL.md`.

## Repos base disponibles (instalados desde Bitbucket)

| Paquete | Para qué se usa |
|---|---|
| `quuo-common` | Conexión DB (`conn`), helpers AWS, validaciones, `CustomException` (`Utils.ExceptionsTools`) |
| `quuo-auth` | Decoradores `@authorized`, `@multi_source` (`Auth.Utils.EventTools`) |
| `quuo-cognito` | Login / refresh / check de token |
| `quuo-cronjob` | `CronManager` para EventBridge |
| `quuo-models` | Modelos SQLAlchemy — importar con prefijo **`BaseModels.*`** (no `Models.*`) |
| `quuo-resources` | Catálogos del sistema |

> Antes de implementar algo, **revisar siempre** si ya existe en un repo base.
> Nunca reimplementar.

## Build & Deploy

```bash
# Instalar dependencias
python setup.py develop

# Generar requirements.txt para deploy
pip freeze > requirements.txt

# Lint
ruff check .
ruff format .

# Tests
pytest tests/ -v

# Deploy
sls deploy --stage sqa
sls deploy --stage pdn
```

## Variables de entorno

- `.env` — local
- `.env.sqa` — SQA
- `.env.pdn` — producción

Variables siempre presentes:

```
REPO_USER, REPO_PASS         # Bitbucket — para instalar repos base
SECRET_ROOT, SECRET_CORE     # AWS Secrets Manager
WAF_NAME, WAF_VERSION        # WAF de API Gateway
SECRET_ID_COMPANY            # Code de company para desarrollo local
```

## Reglas de oro

1. **Handlers sin lógica** — solo decorador + delegación.
2. **`conn` como tercer parámetro** — siempre inyectado por el decorador. Nunca instanciar `Database()` directamente.
3. **`db: ConnType` en el `__init__`** de la clase. **No aliasar** las sesiones — acceder directo vía `self.db.read_session` y `self.db.write_session`.
4. **SQLAlchemy construye, sessions ejecutan**: `self.db.read_session.query(stmt).as_dict()` para SELECT, `self.db.write_session.add(insert(...))` para INSERT, `self.db.write_session.update(update(...))` para UPDATE. Nunca `self.db.execute(query)` ni `session.execute()`.
5. **Modelos solo desde `quuo-models`** — `from BaseModels.<Modulo>.<Entidad> import <Entidad>Model`. Nunca definir un modelo en este repo.
6. **`CustomException` viene de `Utils.ExceptionsTools`** (quuo-common), no de quuo-auth.
7. **`get_input_data(event)`** para parsear input — nunca `event.get('queryStringParameters')` directo.
8. **`os_environ['VAR']`** — nunca `os.getenv` con default, nunca hardcodear.
9. **Repos base son solo lectura** — nunca modificar archivos fuera del repo de lógica activo.

## Negocio

- [Reglas de dominio que el agente debe respetar]
- [Validaciones específicas del repo]

## Notas para la IA

- Antes de cualquier código nuevo: leer `.claude/skills/quuo3-dev/SKILL.md` y los `references/` que correspondan:
  - `references/database-sessions.md` — sessions lazy, queries, paginación, anti-patrones
  - `references/models.md` — `BaseModels.*`, `Base` centralizado, convenciones de columnas
  - `references/auth.md` — decoradores y excepciones
  - `references/helpers.md` — helpers de quuo-common (Validations, GeneralTools, etc.)
  - `references/cronjob.md` — patrón de cronjobs (no usa `@authorized`)
  - `references/serverless.md` — sección `custom` y registro de Lambdas
  - `references/dependencies.md` — `setup.py` y `requirements/`
- Para esquemas de tablas: consultar `.claude/skills/quuo3-dev/tables_structure.csv`.
