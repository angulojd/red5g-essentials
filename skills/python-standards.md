---
name: python-standards
description: "Global Python backend coding standards for serverless AWS projects. Auto-activates for any Python file editing. Enforces PEP 8, typing, Pydantic v2, pydantic-settings, English code / Spanish docstrings, security rules, SOLID, and structured logging."
globs: ["**/*.py"]
---

# Estándares de Código Python — red5g

Estas reglas son INNEGOCIABLES. Aplican a TODOS los proyectos Python de la empresa. Lee también el `CLAUDE.md` del proyecto para reglas específicas del dominio.

## Reglas de Código

### Tipado y Validación
- Type hints OBLIGATORIOS en todas las funciones: parámetros Y retorno.
- Usa `Pydantic v2` para validación de I/O. No dicts manuales con asserts.
- Usa `pydantic-settings` para configuración. Todo en `config.py`.

### Estilo
- Line-length: lo que diga `pyproject.toml`. Default: 100.
- Naming: `snake_case` para variables/funciones, `PascalCase` para clases, `UPPER_SNAKE_CASE` para constantes.
- 2 líneas vacías entre funciones top-level, 1 entre métodos de clase.

### Idioma (ESTRICTO)
- Código fuente (variables, funciones, clases, dict keys internos): **100% inglés**.
- Docstrings, comentarios, mensajes de log: **100% español**.
- Toda función pública, clase y módulo DEBE tener docstring en español.

### Seguridad
- CERO credenciales hardcodeadas. Todo desde `config.py` con `pydantic-settings`.
- PROHIBIDO `os.environ[`, `os.getenv(` fuera de `config.py`.
- PROHIBIDO `print()` en producción. Usa `logger`.
- Importa configuración SIEMPRE como: `from config import settings`.

### Arquitectura
- Handlers/entry points ultra-ligeros: solo parseo + delegación.
- Funciones máximo 100 líneas. Más = refactorizar.
- Máximo 3 niveles de anidamiento. Usa guard clauses.
- SOLID: una responsabilidad por función/módulo, dependencias como parámetro.

### Error Handling
- Excepciones específicas, nunca `except Exception` genérico.
- PROHIBIDO `except: pass` (errores silenciados).
- Logs con contexto: incluir request_id, user_id, operación relevante.

### Workflow de Calidad
- Hook PostToolUse ejecuta `ruff check` + `ruff format --check` en cada Write/Edit de `.py`.
- Si falla, BLOQUEA la acción. Corrige antes de continuar.
- Antes de commit, ejecuta el agente `code-auditor` sobre los archivos modificados.
- No marques una tarea como completa hasta que `code-auditor` dé veredicto ✅.

### Git
- Conventional Commits: `feat(scope): descripción`, `fix(scope): descripción`, etc.
- Git Flow: feature/* desde develop, release/* y hotfix/* según el patrón.
- Usa el agente `git-flow` para operaciones de branching.
