"""PreToolUse hook: verifica quality gates antes de git commit.

Se ejecuta antes de Bash cuando el comando contiene 'git commit'.
Exit code 2 = BLOQUEA el commit.
Exit code 0 = permite continuar.
"""

import json
import shutil
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
    command: str = tool_input.get("command", "")

    # Solo interceptar git commit
    if "git commit" not in command:
        sys.exit(0)

    errors: list[str] = []

    # Gate 1: ruff check
    ruff_path = shutil.which("ruff")
    if ruff_path:
        result = subprocess.run(
            [ruff_path, "check", "src/"],
            capture_output=True,
            text=True,
        )
        if result.returncode != 0:
            errors.append(f"RUFF CHECK:\n{result.stdout.strip()}")

    # Gate 2: pytest (solo si hay tests)
    pytest_path = shutil.which("pytest")
    if pytest_path:
        result = subprocess.run(
            [pytest_path, "tests/", "-v", "--tb=short", "-q"],
            capture_output=True,
            text=True,
        )
        if result.returncode != 0:
            errors.append(
                f"PYTEST:\n{result.stdout.strip()}\n{result.stderr.strip()}"
            )

    if errors:
        detail = "\n\n".join(errors)
        msg = (
            f"[PRE-COMMIT BLOCKED]\n\n"
            f"{detail}\n\n"
            "Corrige estos errores antes de hacer commit."
        )
        print(msg, file=sys.stderr)
        sys.exit(2)

    sys.exit(0)


if __name__ == "__main__":
    main()
