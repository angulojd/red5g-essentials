# Referencia: Autenticación y Decoradores

## Origen

Los decoradores están en el repo **quuo-auth**, ruta `Utils/EventTools.py`.
Instalado como `quuo-auth`. El `package_dir` mapea con prefijo `Auth.`:

```python
from Auth.Utils.EventTools import authorized, multi_source
```

> ⚠️ `CustomException` NO vive en quuo-auth. Viene de `quuo-common`:
> ```python
> from Utils.ExceptionsTools import CustomException, get_and_print_error
> ```

---

## `@authorized` — Endpoints HTTP síncronos

Usar para cualquier Lambda expuesta como endpoint REST estándar via API Gateway.

### Qué hace internamente

1. Detecta si la Lambda está siendo calentada (warmup) → responde y sale.
2. Determina el `event_source` con `get_lambda_event_source(event)`.
3. **Producción:**
   - `conn = Database()` (sin secreto, lazy)
   - `auth = Authorization(conn)`
   - `conn = auth.check_resource_auth(event)` → extrae `custom:company_code` del token Cognito, inicializa sesiones de la company y verifica permisos
   - `data = func(event, context, conn)`
4. **Localhost:**
   - `conn = Database(SECRET_ID_COMPANY)` (usa company hardcodeada del `.env`)
   - `event['user_id'] = 0`, `event['company_id'] = SECRET_ID_COMPANY`
   - `data = func(event, context, conn)`
5. Captura excepciones (ver tabla abajo) y construye `data = {"statusCode", "data"}`.
6. Llama `Response(event, data, context).getResponse(log=...)` que arma el envelope final.

### Excepciones manejadas automáticamente

| Excepción | Origen | Status code |
|---|---|---|
| `CustomException` | `Utils.ExceptionsTools` (quuo-common) | el del propio error (`err.status_code`) |
| `AssertionError` | builtin | 400 |
| `KeyError` | builtin | 400 |
| `ValueError` | builtin | 400 |
| `AttributeError` | builtin | 400 |
| `InvalidRequestError` | `sqlalchemy.exc` | 400 |
| `DisabledCompanyException` | `Auth.Utils.TokenTools` | 403 |
| `DisabledUserException` | `Auth.Utils.TokenTools` | 403 |
| `TypeError` | builtin | 500 |
| `SQLAlchemyError` | `sqlalchemy.exc` | 500 |
| `Exception` | builtin (catch-all) | 500 |

> En producción los errores 400 retornan un mensaje genérico por seguridad.
> En localhost retornan el mensaje real del error (`str(err)`).

### Uso

```python
from Auth.Utils.EventTools import authorized
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
```

---

## `@multi_source` — Procesos multi-origen (async)

Usar cuando la Lambda puede ser invocada desde:
- **API Gateway** (HTTP) — comportamiento idéntico a `@authorized` si `authorized_=True`
- **SQS** (cola de mensajes)
- **Invocación directa de Lambda** (`manual_exec=1` en el event)

### Parámetros

| Parámetro | Default | Descripción |
|---|---|---|
| `authorized_` | `True` | Si requiere autorización cuando viene de API Gateway. |
| `alt_http_method` | — | Método HTTP a simular cuando origen es SQS (porque SQS no tiene `httpMethod`). |

### Cómo distingue origen

1. **`'sqs'`**: detecta `Records[*].eventSource == 'aws:sqs'`. Extrae `body` de cada SQS record, lo coloca en `event['body']`, obtiene `company_code` del body, crea `conn = Database()` con esa company.
2. **`'api'`**: detecta `httpMethod` o `requestContext`. Si `authorized_=True`, aplica `@authorized` por dentro.
3. **`'lambda'`**: detecta `manual_exec=1` en el body. Obtiene `company_code` del body e inicializa sesiones.

### Uso

```python
from Auth.Utils.EventTools import multi_source
from Auth.Classes.MyClass import MyClass


@multi_source(alt_http_method="POST")
def my_async_handler(event, context, conn):
    cls = MyClass(conn)
    methods = {
        "POST": cls.process_async,
    }
    return methods[event['httpMethod']](event)
```

---

## Lanzar excepciones desde la lógica de negocio

Para retornar errores con control desde las clases de lógica:

```python
from Utils.ExceptionsTools import CustomException

# Error con status code custom
raise CustomException("El campo X es requerido.")              # 400 por defecto
raise CustomException(message="Conflicto", status_code=409)
raise CustomException(message="No autorizado", status_code=403)

# Validaciones rápidas (el decorador las convierte a 400)
assert condition, "Mensaje de error opcional"
```

---

## Lo que NO hacer

```python
# Mal: importar CustomException desde quuo-auth
from Auth.Exceptions.CustomException import CustomException     # NUNCA — no existe ahí

# Mal: construir respuesta HTTP manualmente en la clase de lógica
return {
    "statusCode": 200,
    "body": json.dumps({"data": result})                        # NUNCA
}

# Mal: capturar excepciones genéricas en la clase de lógica
try:
    ...
except Exception as e:                                          # NUNCA — el decorador ya lo hace
    return {"error": str(e)}

# Mal: aplicar @authorized y @multi_source al mismo handler
@authorized
@multi_source()                                                  # NUNCA — son mutuamente exclusivos
def handler(...):
    ...
```
