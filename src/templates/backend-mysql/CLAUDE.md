<!-- red5g:template:backend-mysql -->
# 🤖 Development Guide — [PROJECT NAME]

> **EDIT THIS FILE** with your project-specific information.
> Code rules (PEP 8, typing, security, SOLID) are in `.claude/skills/python-standards.md`.
> Workflow guide is in `.claude/skills/workflow-guide.md`.

## Architecture

- **Stack:** Python 3.13 · Serverless Framework v3 · AWS Lambda · MySQL · SQLAlchemy ORM · Pydantic v2
- **Credentials:** AWS Secrets Manager → SSM → env vars → pydantic-settings (`src/config.py`)

```
API Gateway → Handler → Controller → Service → Repository → Model/Schema
```

## Build & Test

```bash
pip install -r requirements.txt
pytest tests/ -v
ruff check src/
sls deploy --stage dev
```

## Database

- **Models:** SQLAlchemy ORM in `src/models/`, extend `Base` from `src/database.py`
- **Schemas:** Pydantic v2 in `src/schemas/` — API validation only, NOT DB models
- **Connection:** `pool_pre_ping=True`, `pool_recycle=3600` for Lambda reuse

## External Services

- [List: Twilio, Stripe, SendGrid, etc.]
- All credentials via Secrets Manager → SSM → env vars → pydantic-settings

## Business Rules

- [Domain rules the agent must respect]
- [Specific validations]

## Security

- [Domain-specific security rules]
- [Input validation: max length, allowed characters, etc.]

## Notes for AI

- Read `src/config.py` before touching any service.
- Every new endpoint: handler → controller → service → repository → model + schema → test.
