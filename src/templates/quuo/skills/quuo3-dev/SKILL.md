---
name: quuo3-dev
description: >
  Guía de desarrollo para el proyecto Quuo versión 3. Usar SIEMPRE que se vaya
  a crear, modificar o extender cualquier Lambda, endpoint, clase, handler,
  módulo o funcionalidad dentro del stack Quuo 3. Cubre la arquitectura
  multi-repo, los repos base disponibles, convenciones de código obligatorias,
  patrones de conexión a DB (read/write sessions), autenticación, manejo de
  variables de entorno y estructura del serverless.yml. No generar código nuevo
  sin consultar esta skill primero. Aplicar también cuando se agreguen
  dependencias, se definan nuevos modelos, se registren nuevas lambdas o se
  estructure cualquier clase de lógica de negocio.
---

# Quuo 3 — Guía de desarrollo para Claude

Esta skill es una **tabla de contenidos con lo esencial**. Para detalles
profundos de cada concepto, lee el archivo correspondiente en `references/`.

## Contexto general

Quuo 3 es una plataforma fintech colombiana sobre AWS Serverless
(Lambda + API Gateway + RDS MySQL). El proyecto está dividido en múltiples
repos de Bitbucket:

- **Repos base**: utilidades compartidas (DB, auth, modelos, helpers AWS).
- **Repos de lógica**: implementan negocio; consumen los repos base como paquetes pip.

> ⚠️ Nunca reimplementar funcionalidades que ya existen en los repos base.
> Siempre importar desde el paquete correspondiente.

---

## Repos base disponibles

| Paquete | Carpeta | Responsabilidad | Prefix de import |
|---|---|---|---|
| `quuo-common` | `quuo-common/` | Conexión DB, helpers AWS, validaciones, exceptions | `DataBase.*`, `Utils.*`, `Constants.*`, `Base.*` (sin `Common.`) |
| `quuo-auth` | `quuo-auth/` | Decoradores `@authorized`, `@multi_source` | `Auth.Classes.*`, `Auth.Utils.*`, `Auth.Constants.*` |
| `quuo-cognito` | `quuo-cognito/` | Login, refresh, check token Cognito | `Cognito.Classes.*` |
| `quuo-cronjob` | `quuo-cronjob/` | `CronManager` para EventBridge | `CronJob.Classes.*` |
| `quuo-models` | `quuo-models/` | Modelos SQLAlchemy de toda la plataforma | **`BaseModels.*`** (NO `Models.*`) |
| `quuo-resources` | `quuo-resources/` | Catálogos del sistema | `Resources.*` |

### 🔥 Imports cheat sheet — los más usados

```python
# Modelos (BaseModels, no Models)
from BaseModels.Auth.Profile import ProfileModel
from BaseModels.User.User import UserModel
from BaseModels.DataBase.Base import Base                     # Base centralizado

# Decoradores
from Auth.Utils.EventTools import authorized, multi_source

# Exceptions (vienen de quuo-common, NO de quuo-auth)
from Utils.ExceptionsTools import CustomException, get_and_print_error

# Helpers de quuo-common
from Utils.GeneralTools import get_input_data, as_set, as_list
from Utils.Validations import Validations, check_query_limit
from Utils.QueryTools import get_model_columns
from Utils.TypingTools import EventType, ConnType, APIResponseType
from Utils.Http.StatusCode import StatusCode
```

---

## Repositorios locales — regla de SOLO LECTURA

Todos los repos del proyecto (base y de lógica) están clonados localmente.
Antes de implementar algo, navegar al repo base correspondiente para verificar
firmas de funciones, modelos y helpers.

> ⛔ **Claude NO debe crear, modificar, renombrar ni eliminar ningún archivo**
> dentro de ningún repo base ni de ningún repo de lógica que no sea el repo
> de trabajo actual del requerimiento.
>
> Si un cambio necesita modificar un repo base: **detener, informar al
> desarrollador, proponer la solución correcta** (agregar el cambio al repo
> base como tarea separada, o buscar alternativa dentro del repo de lógica).

---

## Checklist obligatorio antes de generar código

- [ ] ¿La funcionalidad ya existe en un repo base? → Importar, no reimplementar.
- [ ] ¿Voy a tocar un archivo fuera del repo de lógica activo? → **DETENER.**
- [ ] ¿El handler usa `@authorized` o `@multi_source`? → Nunca lógica en el handler.
- [ ] ¿La clase recibe `db: ConnType` en el constructor (sin aliasing)?
- [ ] ¿Los modelos vienen de `BaseModels.*` (no `Models.*`)?
- [ ] ¿Estoy usando `self.db.read_session.query(...)` / `self.db.write_session.add(...)` / `self.db.write_session.update(...)` (no `self.db.execute(...)`)?
- [ ] ¿`get_input_data(event)` para parsear input (no `event.get('queryStringParameters')`)?
- [ ] ¿Las constantes se leen con `os_environ` (no `os.getenv` con default)?
- [ ] ¿La nueva Lambda está registrada en `serverless.yml`?

---

## Estructura de un repo de lógica

```
.
├── Classes/                # Clases de lógica (PascalCase.py)
├── handlers/               # Handlers SIN lógica (PascalCaseHandler.py)
├── Helpers/                # Funciones auxiliares reutilizables (opcional, vacío)
├── schemas/                # Esquemas de validación (opcional, vacío)
├── tests/                  # pytest (no es estándar Quuo, pero red5g lo añade)
├── requirements/
│   ├── dev.in              # Input top-level de dev (editas tú)
│   ├── lock.in             # Input top-level de runtime (editas tú)
│   ├── requirements-dev.txt    # Generado por pip-compile dev.in
│   ├── requirements-lock.txt   # Generado por pip-compile lock.in
│   ├── requirements-git.txt    # Repos base de Quuo (editas a mano)
│   └── readme.txt          # Cheatsheet de comandos pip-compile
├── .env / .env.sqa / .env.pdn   # NO commitear
├── requirements.txt        # Generado por script.py — empaquetado por serverless
├── serverless.yml
├── setup.py                # collect_requirements + write_requirements_file
├── script.py               # Wrapper que invoca setup.py para generar requirements.txt
├── bitbucket-pipelines.yml # CI: build + deploy con `python3 script.py`
└── dependences.json        # Manifest opcional de paquetes/dominios usados
```

> Detalle del flujo `dev.in/lock.in → pip-compile → script.py → requirements.txt`:
> ver `references/dependencies.md`.

---

## Handlers — patrón canónico

Los handlers **no contienen lógica**. Solo: importan decorador + clase, y delegan.

```python
# handlers/ProfileHandler.py
from Auth.Utils.EventTools import authorized, multi_source
from Auth.Classes.Profile import Profile


@authorized
def profile_handler(event, context, conn):
    cls = Profile(conn)
    methods = {
        "GET":    cls.get_profiles,
        "POST":   cls.op_profile,
        "PUT":    cls.update,
        "DELETE": cls.delete_profile,
    }
    return methods[event['httpMethod']](event)


@multi_source(alt_http_method="POST")
def profile_async_handler(event, context, conn):
    cls = Profile(conn)
    methods = {"POST": cls.process_async}
    return methods[event['httpMethod']](event)
```

- `@authorized` → endpoints HTTP síncronos (API Gateway).
- `@multi_source` → procesos invocables desde SQS, API Gateway o Lambda directa.

> Detalle del flujo interno de los decoradores y tabla completa de excepciones: ver `references/auth.md`.

---

## Clases de lógica — patrón canónico

```python
from sqlalchemy import select, update, insert
from BaseModels.Auth.Profile import ProfileModel, DES_MAX_LEN
from Utils.ExceptionsTools import CustomException
from Utils.GeneralTools import get_input_data
from Utils.Validations import Validations
from Utils.TypingTools import EventType, ConnType, APIResponseType
from Utils.Http.StatusCode import StatusCode
from Auth.Constants.ErrorMessages import ERROR_MESSAGE_PROFILE


ERROR_MESSAGE = ERROR_MESSAGE_PROFILE


class Profile:
    """Class used for users profiles management"""
    model = ProfileModel
    updatable_properties = ['area_id', 'name', 'description']

    def __init__(self, db: ConnType):
        self.db: ConnType = db
        self.val = Validations()

    def get_profiles(self, event: EventType) -> APIResponseType:
        ...
```

### Orden de elementos dentro de la clase

1. Atributos de clase (`model`, `updatable_properties`)
2. `__init__(self, db: ConnType)`
3. Métodos públicos llamados desde el handler
4. Métodos auxiliares (`_metodo_auxiliar`)
5. Métodos privados (`__metodo_privado`)

### Orden de imports

1. stdlib y typing → 2. SQLAlchemy → 3. Modelos (`BaseModels.*`) → 4. Clases internas del repo → 5. Tools/exceptions de `Utils.*` → 6. Constants del propio repo.

---

## Conexión y queries — esencial

`conn` (un `Database` manager) lo inyecta el decorador. **Nunca** instanciar
`Database()` directamente. Es un manager con propiedades lazy:

| Sesión | Para qué |
|---|---|
| `self.db.read_session` | SELECT a la company actual |
| `self.db.write_session` | INSERT / UPDATE / DELETE a la company actual |
| `self.db.core_read` | SELECT a core (config, auth, catálogos) |
| `self.db.core_write` | Escritura a core |
| `self.db.root_conn` | Solo para creación de companies |

> ⚠️ **No aliasar** las sesiones en `__init__`. Acceder siempre directo
> (`self.db.read_session.query(...)`), nunca `self.session = ...`.

```python
# SELECT (lista de dicts)
stmt = select(ProfileModel).filter_by(active=1)
records = self.db.read_session.query(stmt).as_dict()

# INSERT (retorna id insertado)
new_id = self.db.write_session.add(
    insert(ProfileModel).values(name="X", area_id=1)
)

# UPDATE (retorna filas afectadas, soft-delete típico)
affected = self.db.write_session.update(
    update(ProfileModel)
    .where(ProfileModel.profile_id == pk, ProfileModel.active == 1)
    .values(active=0)
)
```

> Variantes (`first`, `all`, bulk inserts con `many=True`, queries a core, paginación con `check_query_limit`): ver `references/database-sessions.md`.

---

## Validaciones de input

```python
from Utils.GeneralTools import get_input_data
from Utils.Validations import Validations
from Utils.ExceptionsTools import CustomException

request = get_input_data(event)   # parsea body POST o queryStringParameters GET

val = Validations()
validated = val.validate([
    val.param("name", str, request.get("name"), 250),    # tipo + max length
    val.param("area_id", int, request.get("area_id")),
])
if not validated['isValid']:
    raise CustomException(validated["data"])
```

> ⚠️ Nunca `event.get('queryStringParameters')` directo — siempre `get_input_data(event)`.
> Catálogo completo de helpers (`as_set`, `check_query_limit`, `get_model_columns`, helpers AWS, etc.): ver `references/helpers.md`.

---

## Modelos SQLAlchemy

```python
from BaseModels.Auth.Profile import ProfileModel
from BaseModels.User.User import UserModel
from BaseModels.DataBase.Base import Base                # Base centralizado
```

- Vienen de `quuo-models`, prefijo **`BaseModels.`** (NO `Models.`).
- Nunca definir modelos dentro de un repo de lógica.
- PK siempre es `<entidad>_id` (no `id`). Columnas estándar: `created_at`, `updated_at`, `active`.

> Convenciones completas, ejemplo de modelo real, lista de los 43 dominios de `quuo-models`: ver `references/models.md`.

---

## Excepciones — manejo

```python
from Utils.ExceptionsTools import CustomException

raise CustomException("El campo X es requerido.")              # 400 por defecto
raise CustomException(message="Conflicto", status_code=409)
assert condition, "Mensaje opcional"                            # → 400 automático
```

`@authorized` captura automáticamente:

| Excepción | Status |
|---|---|
| `CustomException` | el del propio error |
| `AssertionError`, `KeyError`, `ValueError`, `AttributeError`, `InvalidRequestError` | 400 |
| `DisabledCompanyException`, `DisabledUserException` (de `Auth.Utils.TokenTools`) | 403 |
| `TypeError`, `SQLAlchemyError`, `Exception` | 500 |

---

## Variables de entorno

Definidas en `.env` / `.env.sqa` / `.env.pdn` y referenciadas en `serverless.yml`.
Dentro del código siempre así:

```python
from os import environ as os_environ

MAIL_URL = os_environ['MAIL_URL']
```

```yaml
# serverless.yml
environment:
  MAIL_URL: ${env:MAIL_URL}
```

**Nunca** `os.getenv()` con default para variables requeridas.
**Nunca** hardcodear URLs, credenciales o configuraciones.

---

## Formato de respuesta

El envelope final lo construye `Response.getResponse()` (en `quuo-common`):

```json
{
    "responseCode": "200",
    "responseReason": "200 OK",
    "description": "La solicitud fue exitosa.",
    "data": [ ... ]
}
```

**Dentro de la clase de lógica solo retornas** `{"statusCode": ..., "data": ...}`:

```python
return {"statusCode": StatusCode(200), "data": data}
```

NO construir el envelope completo en la clase. El decorador `@authorized`
y `Response.getResponse()` lo arman.

---

## Estilo de código

- **PEP 8** estricto. ruff configurado para validar.
- Clases: `PascalCase`. Métodos y variables: `snake_case`. Constantes: `UPPER_SNAKE_CASE`.
- Archivos de clase: `PascalCase.py` (`Profile.py`).
- Archivos de handler: `PascalCase + Handler.py` (`ProfileHandler.py`).
- Modelos: `<Entidad>Model` en `<Entidad>.py` dentro de `BaseModels/<Dominio>/`.
- Carpetas: PascalCase para módulos (`Classes/`, `BaseModels/`), lowercase para `handlers/`, `requirements/`, `schemas/`.

---

## Índice de references

Cuándo abrir cada archivo de `references/`:

| Archivo | Léelo cuando... |
|---|---|
| **`database-sessions.md`** | Necesites variantes de SELECT (`first`/`all`), bulk inserts, queries a core, paginación con `check_query_limit`, o entender el flujo `Authorization.check_resource_auth()`. |
| **`models.md`** | Vayas a usar un modelo y necesites confirmar el dominio (lista completa de 43 carpetas), las convenciones de columnas, o ver un ejemplo real con `current_timestamp()`. |
| **`auth.md`** | Necesites el flujo interno del decorador `@authorized`, los parámetros de `@multi_source` (`alt_http_method`, `authorized_=False`), o cómo distingue origen SQS/API/Lambda. |
| **`helpers.md`** | Vayas a validar input y quieras todos los métodos de `Validations`, o necesites un helper específico (`as_set`, `check_query_limit`, `get_model_columns`, AWS tools como `S3Tools`, `SQSTools`, `CognitoManager`, etc.). |
| **`cronjob.md`** | Vayas a crear un Lambda disparado por EventBridge — **NO uses `@authorized`**, hay un patrón distinto con `@response_format` + `CronManager`. |
| **`serverless.md`** | Tengas que registrar una nueva Lambda en `serverless.yml`, configurar la sección `custom`, o agregar un evento SQS/cronjob. |
| **`dependencies.md`** | Vayas a tocar `setup.py`, `requirements/requirements-git.txt`, o agregar un nuevo repo base como dependencia. |
