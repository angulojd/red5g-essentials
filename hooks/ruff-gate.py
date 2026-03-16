"""PostToolUse hook: valida PEP 8 con ruff.

Se ejecuta despues de Write/Edit en archivos .py.
Exit code 2 = BLOQUEA la accion de Claude.
Exit code 0 = permite continuar.
"""

import json
import os
import subprocess
import sys


def main() -> None:
    """Punto de entrada del hook."""
    try:
        input_data = sys.stdin.read()
        if not input_data:
            sys.exit(0)
        payload = json.loads(input_data)
    except (json.JSONDecodeError, OSError):
        sys.exit(0)

    tool_input = payload.get("tool_input", {})
    file_path: str = (
        tool_input.get("file_path")
        or tool_input.get("path")
        or tool_input.get("target")
        or ""
    )

    if not file_path.endswith(".py"):
        sys.exit(0)
    if not os.path.exists(file_path):
        sys.exit(0)

    errors: list[str] = []

    # Capa 1: ruff check (linting)
    lint = subprocess.run(
        ["ruff", "check", file_path],
        capture_output=True,
        text=True,
    )
    if lint.returncode != 0:
        errors.append(f"LINT:\n{lint.stdout.strip()}")

    # Capa 2: ruff format --check (formateo)
    fmt = subprocess.run(
        ["ruff", "format", "--check", file_path],
        capture_output=True,
        text=True,
    )
    if fmt.returncode != 0:
        errors.append(f"FORMAT:\n{fmt.stdout.strip()}")

    if errors:
        detail = "\n\n".join(errors)
        msg = (
            f"[HOOK BLOCKED] {file_path}\n\n"
            f"{detail}\n\n"
            "Corrige estos errores antes de "
            "continuar."
        )
        print(msg, file=sys.stderr)
        sys.exit(2)

    sys.exit(0)


if __name__ == "__main__":
    main()
