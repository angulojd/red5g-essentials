#!/usr/bin/env bash
set -euo pipefail
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
info(){ echo -e "${BLUE}[INFO]${NC}  $1"; }; ok(){ echo -e "${GREEN}[OK]${NC}    $1"; }
warn(){ echo -e "${YELLOW}[WARN]${NC}  $1"; }; fail(){ echo -e "${RED}[FAIL]${NC}  $1"; exit 1; }
TEMPLATE="generic"; SCAFFOLD=false
while [[ $# -gt 0 ]]; do case $1 in --template) TEMPLATE="$2"; shift 2;; --scaffold) SCAFFOLD=true; shift;; --help|-h) echo "Usage: ./setup.sh [--template <n>] [--scaffold]"; echo "Templates: backend-mysql, generic"; echo "--scaffold creates src/ folder structure (backend-mysql only)"; exit 0;; *) fail "Unknown: $1";; esac; done
case $TEMPLATE in backend-mysql|generic) ;; *) fail "Unknown template: $TEMPLATE";; esac
info "Template: $TEMPLATE | Scaffold: $SCAFFOLD"
info "Checking prerequisites..."
command -v node >/dev/null 2>&1 || fail "Node.js not found"
command -v git >/dev/null 2>&1 || fail "Git not found"
command -v claude >/dev/null 2>&1 || fail "Claude Code not found"
ok "Prerequisites verified"
info "Installing OpenSpec..."
if command -v openspec >/dev/null 2>&1; then ok "OpenSpec already installed"; else npm install -g @fission-ai/openspec@latest; ok "OpenSpec installed"; fi
info "Installing Beads..."
if command -v bd >/dev/null 2>&1; then ok "Beads already installed"; else if command -v brew >/dev/null 2>&1; then brew install beads; else curl -fsSL https://raw.githubusercontent.com/steveyegge/beads/main/scripts/install.sh | bash; fi; ok "Beads installed"; fi
info "Checking ruff..."
if command -v ruff >/dev/null 2>&1; then ok "ruff already installed"; else warn "Installing ruff..."; if curl -LsSf https://astral.sh/ruff/install.sh 2>/dev/null | sh 2>/dev/null; then ok "ruff installed"; elif command -v pipx >/dev/null 2>&1 && pipx install ruff 2>/dev/null; then ok "ruff installed"; elif command -v pip3 >/dev/null 2>&1 && pip3 install ruff --break-system-packages 2>/dev/null; then ok "ruff installed"; else fail "Could not install ruff. Run: curl -LsSf https://astral.sh/ruff/install.sh | sh"; fi; fi
info "Initializing OpenSpec..."
if [ -d "openspec" ]; then ok "Already initialized"; else openspec init --tools claude; ok "Done"; fi
info "Initializing Beads..."
if [ -d ".beads" ]; then ok "Already initialized"; else bd init --quiet; bd setup claude; ok "Done"; fi
mkdir -p .claude/plans .claude/prompts .claude/prd .claude/agent-memory/code-auditor
SETTINGS_FILE=".claude/settings.json"
if [ ! -f "$SETTINGS_FILE" ]; then cat > "$SETTINGS_FILE" << 'EOF'
{"permissions":{"allow":["Bash(bd:*)","Bash(openspec:*)","Bash(ruff:*)", "Bash(gh:*)"]},"env":{"CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS":"1"}}
EOF
ok "settings.json created"; fi
if [ ! -f "pyproject.toml" ]; then cat > "pyproject.toml" << 'EOF'
[tool.ruff]
line-length = 100
target-version = "py313"
[tool.ruff.lint]
select = ["E","W","F","I","B","SIM","C90","UP","ARG","RET","BLE","S"]
[tool.ruff.lint.mccabe]
max-complexity = 10
[tool.pytest.ini_options]
testpaths = ["tests"]
python_files = ["test_*.py"]
EOF
ok "pyproject.toml created"; fi
if [ "$SCAFFOLD" = true ] && [ "$TEMPLATE" = "backend-mysql" ]; then
info "Creating project scaffold..."
mkdir -p src/{handlers,controllers,services,repositories,models,schemas,utils,exceptions}
mkdir -p tests/{test_handlers,test_services,test_repositories}
for d in src src/handlers src/controllers src/services src/repositories src/models src/schemas src/utils src/exceptions; do touch "$d/__init__.py"; done
[ ! -f "src/config.py" ] && cat > "src/config.py" << 'PYEOF'
"""Configuración centralizada via pydantic-settings.

Las variables de entorno son inyectadas por Serverless Framework v3
desde AWS Secrets Manager via SSM Parameter Store.
En serverless.yml:
  environment:
    DB_HOST: ${ssm:/aws/reference/secretsmanager/${env:SECRET_NAME}~true}
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Configuración global del proyecto."""

    # Database (MySQL)
    db_host: str
    db_port: int = 3306
    db_user: str
    db_password: str
    db_name: str

    # AWS
    aws_region: str = "us-east-1"
    s3_bucket: str = ""

    # App
    debug: bool = False
    log_level: str = "INFO"

    class Config:
        """Configuración de pydantic-settings."""

        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
PYEOF
[ ! -f "src/database.py" ] && cat > "src/database.py" << 'PYEOF'
"""SQLAlchemy ORM — engine, session, Base.

Conexión a MySQL con pool_pre_ping para Lambda.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import (
    Session,
    declarative_base,
    sessionmaker,
)

from src.config import settings

DATABASE_URL: str = (
    f"mysql+pymysql://{settings.db_user}:{settings.db_password}"
    f"@{settings.db_host}:{settings.db_port}/{settings.db_name}"
)

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=3600,
)

SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()


def get_session() -> Session:
    """Obtiene una sesión de base de datos."""
    return SessionLocal()
PYEOF
[ ! -f "src/utils/logger.py" ] && cat > "src/utils/logger.py" << 'PYEOF'
"""Logging estructurado para CloudWatch."""

import logging
import os


def get_logger(name: str) -> logging.Logger:
    """Crea logger con formato para CloudWatch.

    Args:
        name: Nombre del módulo.

    Returns:
        logging.Logger: Logger configurado.
    """
    logger = logging.getLogger(name)
    level = os.environ.get("LOG_LEVEL", "INFO")
    logger.setLevel(getattr(logging, level, logging.INFO))
    if not logger.handlers:
        handler = logging.StreamHandler()
        fmt = logging.Formatter(
            "%(asctime)s | %(levelname)s | %(name)s | %(message)s"
        )
        handler.setFormatter(fmt)
        logger.addHandler(handler)
    return logger
PYEOF
[ ! -f ".env.example" ] && cat > ".env.example" << 'EOF'
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=local_password
DB_NAME=mydb
AWS_REGION=us-east-1
S3_BUCKET=my-bucket
DEBUG=true
LOG_LEVEL=DEBUG
EOF
[ ! -f "src/exceptions/domain.py" ] && cat > "src/exceptions/domain.py" << 'PYEOF'
"""Excepciones custom del dominio.

Cada excepción define su status code HTTP para que
el decorador @handle_exceptions las mapee automáticamente.
"""

from http import HTTPStatus


class DomainException(Exception):
    """Excepción base del dominio."""

    default_message: str = "Error interno del servidor"

    def __init__(self, message: str | None = None) -> None:
        """Inicializa la excepción.

        Args:
            message: Mensaje descriptivo del error.
        """
        self.message = message or self.default_message
        super().__init__(self.message)


class NotFoundError(DomainException):
    """Recurso no encontrado."""

    status_code = HTTPStatus.NOT_FOUND
    default_message = "Recurso no encontrado"


class ValidationError(DomainException):
    """Error de validación de datos."""

    status_code = HTTPStatus.BAD_REQUEST
    default_message = "Datos inválidos"


class ConflictError(DomainException):
    """Conflicto con el estado actual del recurso."""

    status_code = HTTPStatus.CONFLICT
    default_message = "Conflicto con el estado actual"


class UnauthorizedError(DomainException):
    """No autorizado."""

    status_code = HTTPStatus.UNAUTHORIZED
    default_message = "No autorizado"


class ForbiddenError(DomainException):
    """Acceso prohibido."""

    status_code = HTTPStatus.FORBIDDEN
    default_message = "Acceso prohibido"
PYEOF
[ ! -f "src/utils/decorators.py" ] && cat > "src/utils/decorators.py" << 'PYEOF'
"""Decoradores transversales.

@handle_exceptions captura todas las excepciones,
loguea con contexto estructurado, y retorna JSON con status code.
"""

import functools
import json
import traceback
from typing import Any, Callable
from http import HTTPStatus

from src.exceptions.domain import DomainException
from src.utils.logger import get_logger

logger = get_logger(__name__)


def handle_exceptions(func: Callable) -> Callable:
    """Decorador que captura excepciones y retorna respuesta HTTP JSON.

    Captura DomainException (errores de negocio con status code)
    y Exception genérica (500). Loguea con contexto estructurado.

    Args:
        func: Controller function a decorar.

    Returns:
        Callable: Función decorada con manejo de excepciones.
    """

    @functools.wraps(func)
    def wrapper(*args: Any, **kwargs: Any) -> dict[str, Any]:
        """Wrapper que captura excepciones."""
        try:
            return func(*args, **kwargs)
        except DomainException as e:
            logger.warning(
                "Error de dominio | func=%s | status=%s | error=%s",
                func.__name__,
                e.status_code,
                e.message,
            )
            return {
                "statusCode": e.status_code,
                "body": json.dumps({
                    "error": e.message,
                    "type": type(e).__name__,
                }),
            }
        except Exception as e:
            logger.error(
                "Error inesperado | func=%s | error=%s | trace=%s",
                func.__name__,
                str(e),
                traceback.format_exc(),
            )
            return {
                "statusCode": HTTPStatus.INTERNAL_SERVER_ERROR,
                "body": json.dumps({
                    "error": "Error interno del servidor",
                }),
            }

    return wrapper
PYEOF
ok "Scaffold created"
fi
if [ ! -f "CLAUDE.md" ]; then
info "Creating CLAUDE.md (template: $TEMPLATE)..."
case $TEMPLATE in
backend-mysql) cat > "CLAUDE.md" << 'CLAUDEMD'
# 🤖 Development Guide — [PROJECT NAME]

> **EDIT THIS FILE** with your project-specific information.
> Global coding rules are automatically injected via the red5g-essentials plugin.

## 🏗️ Architecture

- **Infrastructure:** 100% Serverless — AWS Lambda, SQS, SNS, API Gateway, S3, CloudWatch.
- **Deployment:** Serverless Framework v3 (`serverless.yml` with `serverless-python-requirements`).
- **Database:** MySQL (Amazon RDS / Aurora Serverless) with **SQLAlchemy ORM** (models, relationships, sessions).
- **Validation:** Pydantic v2 for API request/response schemas only. NOT for DB models.
- **Credentials:** AWS Secrets Manager via SSM Parameter Store → env vars → pydantic-settings.
- **Monitoring:** CloudWatch Logs with structured logging.
- **Storage:** S3 for file uploads/assets.
- **Python:** 3.13

## 🔧 Build & Test

```bash
pip install -r requirements.txt
pytest tests/ -v
ruff check src/
ruff format --check src/
sls deploy --stage dev
```

## 🗄️ Database (MySQL + SQLAlchemy ORM)

- **Models:** SQLAlchemy ORM in `src/models/`. Each model extends `Base` from `src/database.py`.
- **Schemas:** Pydantic v2 in `src/schemas/` for API input/output validation. NOT DB models.
- **Sessions:** Use `get_session()` from `src/database.py`. Always close in finally blocks.
- **Connection:** Module-level engine for Lambda reuse (`pool_pre_ping=True`, `pool_recycle=3600`).

```python
# ✅ SQLAlchemy model (src/models/user.py) — DB structure
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True, nullable=False)

# ✅ Pydantic schema (src/schemas/user.py) — API validation only
class UserCreate(BaseModel):
    email: EmailStr
    name: str = Field(min_length=1, max_length=100)

# ❌ WRONG — using Pydantic for DB models or SQLAlchemy for API validation
```

## 🔐 Credentials (Secrets Manager + SSM)

Credentials live in AWS Secrets Manager, referenced via SSM in `serverless.yml`:

```yaml
# serverless.yml
provider:
  environment:
    DB_HOST: ${ssm:/aws/reference/secretsmanager/${env:SECRET_NAME}~true}
    DB_PASSWORD: ${ssm:/aws/reference/secretsmanager/${env:SECRET_NAME}~true}
```

`config.py` reads them as env vars via pydantic-settings. NEVER call Secrets Manager directly in code.

```python
# ✅ Correct — pydantic-settings reads env vars injected by Serverless Framework
from config import settings
host = settings.db_host

# ❌ WRONG — boto3 call to Secrets Manager at runtime
client = boto3.client("secretsmanager")
secret = client.get_secret_value(SecretId="my-secret")

# ❌ WRONG — hardcoded credentials
password = "my_secret_123"

# ❌ WRONG — os.environ outside config.py
password = os.environ["DB_PASSWORD"]
```

## 🔧 External Services

- [List your services: Twilio, Stripe, SendGrid, etc.]
- All credentials via Secrets Manager → SSM → env vars → pydantic-settings.

## 📐 Project-Specific Business Rules

- [Domain rules the agent must respect]
- [Specific validations]
- [Business limits]

## 🔒 Project-Specific Security

- [Domain security rules]
- [If AI: prompt injection shielding in SystemMessage]
- [Input validation: max length, allowed characters, etc.]

## 📁 Architecture Pattern
```
API Gateway Event
    ↓
Handler (src/handlers/api.py)         ← Parse event, call controller. MAX 5 lines.
    ↓
@handle_exceptions
Controller (src/controllers/user.py)  ← Orchestrate services, return response.
    ↓
Service (src/services/user_service.py) ← Business logic, validations.
    ↓
Repository (src/repositories/user_repo.py) ← SQLAlchemy queries.
    ↓
Model (src/models/user.py)            ← SQLAlchemy ORM table definition.
Schema (src/schemas/user.py)          ← Pydantic v2 API request/response.
```
```python
# ✅ Handler — ultra light, no try/except
def handler(event, context):
    body = json.loads(event.get("body", "{}"))
    return create_user_controller(body)

# ✅ Controller — decorated, no try/except needed
@handle_exceptions
def create_user_controller(body: dict) -> dict:
    schema = UserCreate(**body)
    user = user_service.create(schema)
    return {"statusCode": 201, "body": json.dumps({"id": user.id})}

# ❌ WRONG — try/except in handler or controller
def handler(event, context):
    try:
        body = json.loads(event["body"])
        return create_user(body)
    except Exception as e:
        return {"statusCode": 500, "body": str(e)}
```

## 📝 Notes for AI

- Read `src/config.py` before touching any service.
- **Handler → Controller → Service → Repository** is the strict call chain.
- Handlers (`src/handlers/`) ONLY parse Lambda event + call controller. Max 5 lines. No try/except.
- Controllers (`src/controllers/`) orchestrate services. Always decorated with `@handle_exceptions`.
- Services (`src/services/`) = business logic. One responsibility per file.
- Repositories (`src/repositories/`) = SQLAlchemy queries. Services call repos.
- Models (`src/models/`) = SQLAlchemy ORM. Schemas (`src/schemas/`) = Pydantic API validation.
- **NEVER use try/except in handlers or controllers.** The `@handle_exceptions` decorator handles all errors.
- NEVER call Secrets Manager directly. Credentials come from env vars via Serverless Framework.
- Every new endpoint: handler → controller → service → repository → model + schema → test.
CLAUDEMD
;;
generic) cat > "CLAUDE.md" << 'CLAUDEMD'
# 🤖 Development Guide — [PROJECT NAME]

> **EDIT THIS FILE** with your project-specific information.
> Global coding rules are automatically injected via the red5g-essentials plugin.

## 🏗️ Architecture
- **Infrastructure:** [Describe]
- **Deployment:** [Describe]
- **Database:** [Describe]

## 🔧 Build & Test
```bash
# Add your commands here
```

## 📐 Business Rules
- [Domain rules]

## 🔒 Security
- [Domain security rules]

## 📝 Notes for AI
- [Key files to read]
- [Patterns]
CLAUDEMD
;;
esac
ok "CLAUDE.md created"
fi
if [ ! -f "AGENTS.md" ]; then cat > "AGENTS.md" << 'EOF'
# Agent Instructions
This project uses `bd` (beads) for task tracking.
## Workflow
1. Start each session: `bd ready --json`
2. Claim: `bd update <id> --claim`
3. Implement, test, audit with `code-auditor`
4. Close: `bd close <id> --reason "description"`
5. Create issues for discovered work
EOF
ok "AGENTS.md created"; fi
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  ✅ Project initialized (template: $TEMPLATE, scaffold: $SCAFFOLD)${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "  Tools: ✓ OpenSpec  ✓ Beads  ✓ ruff"
echo ""
if [ "$SCAFFOLD" = true ] && [ "$TEMPLATE" = "backend-mysql" ]; then
echo "  Scaffold:"
echo "    ✓ src/config.py        — pydantic-settings (Secrets Manager → env vars)"
echo "    ✓ src/database.py      — SQLAlchemy ORM engine + session"
echo "    ✓ src/utils/logger.py  — structured logging (CloudWatch)"
echo "    ✓ src/handlers/        — Lambda entry points"
echo "    ✓ src/services/        — business logic"
echo "    ✓ src/repositories/    — SQLAlchemy queries"
echo "    ✓ src/models/          — SQLAlchemy ORM models"
echo "    ✓ src/schemas/         — Pydantic v2 API schemas"
echo "    ✓ src/controllers/     — API logic (decorated with @handle_exceptions)"
echo "    ✓ src/exceptions/domain.py — custom domain exceptions with status codes"
echo "    ✓ src/utils/decorators.py  — @handle_exceptions decorator"
echo ""
fi
echo "  Next steps:"
echo "    1. Edit CLAUDE.md with your project info"
echo "    2. claude"
echo "    3. Install Essentials plugin (first time only):"
echo "       /plugin marketplace add GantisStorm/essentials-claude-code"
echo "       /plugin install essentials@essentials-claude-code"
echo "    4. /implement-loop <task>  or  /plan-creator <feature>"