# Referencia: Dependencias, setup.py y script.py

## Estructura de la carpeta `requirements/`

```
requirements/
├── dev.in                  # Input top-level de dev (boto3, etc.) — editas tú
├── lock.in                 # Input top-level de runtime (pymysql, sqlalchemy) — editas tú
├── requirements-dev.txt    # Generado por pip-compile dev.in → no editar a mano
├── requirements-lock.txt   # Generado por pip-compile lock.in → no editar a mano
├── requirements-git.txt    # Repos base de Quuo desde Bitbucket — editas a mano
└── readme.txt              # Cheatsheet de comandos pip-compile
```

> ⚠️ La carpeta **se llama `requirements/`** (plural, sin guiones). Está en
> la raíz del repo de lógica. Los archivos `*.txt` son generados — los `.in`
> son los inputs editables.

---

## Flujo completo de generación de `requirements.txt`

```
        ┌──────────────┐         ┌─────────────────────────┐
        │ dev.in       │──pip────▶│ requirements-dev.txt     │
        └──────────────┘ compile  └─────────────────────────┘
                                              │
        ┌──────────────┐         ┌─────────────────────────┐
        │ lock.in      │──pip────▶│ requirements-lock.txt    │
        └──────────────┘ compile  └─────────────────────────┘
                                              │
        ┌──────────────┐                      │
        │ requirements-│                      │
        │ git.txt (a   │──────────────────────┤
        │ mano)        │                      │
        └──────────────┘                      ▼
                              ┌─────────────────────────────┐
                              │ python script.py [--dev]    │
                              │ (lee los 3, reemplaza       │
                              │ USERNAME/PASSWORD, escribe) │
                              └─────────────────────────────┘
                                              │
                                              ▼
                              ┌─────────────────────────────┐
                              │ requirements.txt (en raíz)  │ ← lo empaqueta serverless
                              └─────────────────────────────┘
```

### Comandos en orden

```bash
# 1. Editar dev.in (deps top-level de desarrollo: boto3, ruff, pytest, etc.)
# 2. Editar lock.in (deps top-level de runtime: pymysql, sqlalchemy, etc.)
# 3. Generar los lock files con pip-compile
pip-compile requirements/lock.in --output-file=requirements/requirements-lock.txt
pip-compile requirements/dev.in  --output-file=requirements/requirements-dev.txt

# 4. Editar requirements-git.txt a mano con los repos de Bitbucket que necesitas
# 5. Generar requirements.txt final (consolidado para deploy)
python script.py --dev    # --dev para incluir deps de desarrollo
python script.py          # solo runtime + git (deploy a producción)
```

### `script.py` — el wrapper

```python
import sys

from setup import collect_requirements, write_requirements_file


if __name__ == "__main__":
    dev = "--dev" in sys.argv
    reqs = collect_requirements(dev=dev, git=True, lock=True, write=True)
    write_requirements_file(reqs, "requirements.txt")
    print("Archivo requirements.txt generado.")
```

`script.py` no es opcional — el `bitbucket-pipelines.yml` lo invoca con
`python3 script.py` durante el build/deploy. Sin él, el CI no genera
el `requirements.txt` que `serverless` necesita para empaquetar.

---

## `dependences.json` (sic — con typo)

Manifest plano (sin versiones) que enumera **qué paquetes y dominios usa
este repo**. Existe en la raíz, junto a `setup.py`.

```json
[
    "sqlalchemy",
    "pymysql",
    "boto3",
    "DataBase",
    "Utils",
    "Auth"
]
```

Mezcla librerías externas (`sqlalchemy`, `pymysql`, `boto3`) con paquetes
internos (`DataBase` y `Utils` de quuo-common, `Auth` de quuo-auth, dominios
de `BaseModels.*`). Es un descriptor opcional que algunos repos del
ecosistema usan para automatizaciones internas.

---

## requirements-git.txt

Aquí van **todos los repos base de Quuo** que necesita este repo de lógica,
más el propio repo si tiene dependencias circulares permitidas.

```
# Base — siempre presentes
git+https://USERNAME:PASSWORD@bitbucket.org/red5g-admin/quuo-models.git#egg=quuo-models
git+https://USERNAME:PASSWORD@bitbucket.org/red5g-admin/quuo-auth.git#egg=quuo-auth
git+https://USERNAME:PASSWORD@bitbucket.org/red5g-admin/quuo-common.git#egg=quuo-common

# Opcionales según necesidad del repo
git+https://USERNAME:PASSWORD@bitbucket.org/red5g-admin/quuo-cognito.git#egg=quuo-cognito
git+https://USERNAME:PASSWORD@bitbucket.org/red5g-admin/quuo-cronjob.git#egg=quuo-cronjob
git+https://USERNAME:PASSWORD@bitbucket.org/red5g-admin/quuo-resources.git#egg=quuo-resources

# Otros repos de lógica que este repo necesita (si aplica)
git+https://USERNAME:PASSWORD@bitbucket.org/red5g-admin/quuo-otro-repo.git#egg=quuo-otro-repo
```

`USERNAME` y `PASSWORD` son literales — el `setup.py` los reemplaza
automáticamente con `REPO_USER` y `REPO_PASS` del `.env`.

---

## requirements-dev.txt

Dependencias de Python del entorno de desarrollo, generadas con `pip-compile`.
Incluir boto3 y sus dependencias transitivas (siempre presentes en Lambda):

```
boto3==1.38.27
botocore==1.38.27
jmespath==1.0.1
python-dateutil==2.9.0.post0
s3transfer==0.13.0
six==1.17.0
urllib3==2.4.0
```

Agregar aquí cualquier librería de terceros que use el repo (sqlalchemy, pymysql, etc.).

---

## setup.py estándar

```python
from setuptools import setup
from pathlib import Path


def get_environment():
    env = {}
    env_file = Path(".env")
    if env_file.exists():
        with env_file.open("r", encoding="utf-8") as f:
            for line in f:
                if "=" in line:
                    key, value = line.strip().split("=", 1)
                    env[key] = value
    return env


def read_requirements_file(path, env, preserve_format=False):
    if not path.exists():
        return []
    lines = path.read_text(encoding="utf-8").splitlines()
    processed = []
    for line in lines:
        stripped = line.strip()
        if stripped and not stripped.startswith("#"):
            line = (
                line
                .replace("USERNAME", env.get("REPO_USER", ""))
                .replace("PASSWORD", env.get("REPO_PASS", ""))
            )
            if "#egg=" in line:
                url, egg = line.split("#egg=")
                line = f"{egg.strip()} @ {url.strip()}"
        if preserve_format or (stripped and not stripped.startswith("#")):
            processed.append(line)
    return processed


def collect_requirements(dev, git, lock, write):
    reqs = {}
    env = get_environment()
    if lock:
        reqs["lock"] = read_requirements_file(
            Path("requirements/requirements-lock.txt"), env, write)
    if dev:
        reqs["dev"] = read_requirements_file(
            Path("requirements/requirements-dev.txt"), env, write)
    if git:
        reqs["git"] = read_requirements_file(
            Path("requirements/requirements-git.txt"), env, write)
    return reqs


if __name__ == "__main__":
    requisites = collect_requirements(dev=True, git=True, lock=True, write=False)
    setup(
        name="quuo-nombre-repo",        # ← cambiar por el nombre del repo
        version="3.0.0",
        author="Quuo",
        author_email="red5g@red5g.co",
        package_dir={
            'NombreModulo.Classes': 'Classes'  # ← ajustar al módulo
        },
        python_requires=">=3.11",
        install_requires=[],
        extras_require={
            "dev":  requisites.get("dev", []),
            "lock": requisites.get("lock", []),
            "git":  requisites.get("git", []),
        },
    )
```

---

## .env — Variables requeridas siempre

```bash
# Credenciales de Bitbucket para instalar repos de Quuo
REPO_USER=tu_usuario
REPO_PASS=tu_password_o_token

# Secretos de AWS
SECRET_ROOT=nombre-del-secreto-root
SECRET_CORE=nombre-del-secreto-core

# WAF
WAF_NAME=nombre-del-waf
WAF_VERSION=Regional

# Company para desarrollo local
SECRET_ID_COMPANY=codigo-de-company-local

# Variables propias del repo
MAIL_URL=https://api.mail.net/
```
