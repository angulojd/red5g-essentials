# Referencia: Helpers y utilidades de quuo-common

`quuo-common` es el repo base con utilidades compartidas. Importar **sin
prefijo `Common.`** porque el `package_dir` mapea las carpetas directo:

```python
'Constants': 'Constants',
'DataBase':  'DataBase',
'Utils':     'Utils',
'Base':      'Base',
```

Antes de implementar cualquier helper o validación, **revisa esta lista**.
La regla de oro: si ya existe en quuo-common, importa, no reimplementes.

---

## `Utils.GeneralTools`

| Función | Para qué |
|---|---|
| `get_input_data(event)` | Parsea body POST o queryStringParameters GET de forma uniforme. **SIEMPRE usar esta en vez de acceder al event directamente.** |
| `as_set(value)` | Convierte cualquier iterable a `set`. Útil para deduplicar. |
| `as_list(value)` | Convierte cualquier iterable a `list`. |
| `generate_hash_from_text(text)` | Genera un hash determinístico desde un string. |
| `who_i_am_function()` | Devuelve el nombre de la función desde la que se llama. Útil para logs. |

```python
from Utils.GeneralTools import get_input_data, as_set, as_list

def get_items(self, event):
    request = get_input_data(event)
    ids = as_set(request.get("ids", []))
    ...
```

---

## `Utils.Validations`

Clase principal para validar parámetros de entrada de forma declarativa.

```python
from Utils.Validations import Validations, check_query_limit
from Utils.ExceptionsTools import CustomException


val = Validations()

# Construye una lista de validaciones
validation_list = [
    val.param("area_id", int, request.get("area_id")),                    # tipo
    val.param("name", str, request.get("name"), 250),                     # tipo + max length
    val.param("auth_groups", list, request.get("auth_groups")),
    val.param("description", str, request.get("description"), 500),
]

# Ejecuta todas las validaciones
validated = val.validate(validation_list)
if not validated['isValid']:
    raise CustomException(validated["data"])
```

### Métodos útiles de `Validations`

| Método | Para qué |
|---|---|
| `param(name, type, value, max_length=None)` | Construye un dict de validación para `validate()`. |
| `validate(list)` | Ejecuta todas las validaciones. Retorna `{isValid: bool, data: ...}`. |
| `records(model, ids, conn)` | Verifica que los IDs existen en la tabla del modelo. |
| `validate_nit(nit)` | Valida NIT colombiano (10 dígitos + checksum). |
| `validate_email(email)` | Valida formato de email. |
| `validate_date(date_str)` | Valida formato de fecha. |
| `validate_datetime(dt_str)` | Valida formato de datetime. |

### `check_query_limit(limit, offset)`

Helper de paginación. Convierte y valida que `limit` y `offset` sean enteros
positivos válidos. Lanza error si no.

```python
from Utils.Validations import check_query_limit

if request.get("limit"):
    limit, offset = check_query_limit(request["limit"], request.get("offset", 0))
    stmt = stmt.offset(offset).limit(limit)
```

---

## `Utils.QueryTools`

```python
from Utils.QueryTools import get_model_columns

# Devuelve lista de columnas válidas del modelo
model_columns = get_model_columns(ProfileModel)
# Útil para validar que las keys del request están en el modelo
for key in request.keys():
    if key not in model_columns:
        raise KeyError(f"Campo inválido: {key}")
```

---

## `Utils.CalculationTools`

Helpers de cálculo financiero y fechas.

```python
from Utils.CalculationTools import add_months, days360, str_to_date, str_to_datetime

end_date = add_months(start_date, 12)        # suma 12 meses calendar
days = days360(start_date, end_date)         # cálculo financiero (base 360)
date = str_to_date("2026-04-11")
dt = str_to_datetime("2026-04-11 14:30:00")
```

---

## `Utils.ExceptionsTools`

```python
from Utils.ExceptionsTools import CustomException, get_and_print_error, LOCALHOST
```

| Símbolo | Descripción |
|---|---|
| `CustomException` | Excepción de dominio. `__init__(message, status_code=400)`. |
| `get_and_print_error(err, status_code, message)` | Logea el error y devuelve `{"statusCode": status_code, "data": message}`. |
| `LOCALHOST` | Booleano. `True` si está corriendo en local (afecta mensajes de error). |

---

## `Utils.Http.StatusCode`

Enum HTTP. Úsalo en lugar de literales numéricos cuando puedas:

```python
from Utils.Http.StatusCode import StatusCode

return {"statusCode": StatusCode(200), "data": records}
return {"statusCode": StatusCode(404), "data": "Not found"}
return {"statusCode": StatusCode(201), "data": {"id": new_id}}
```

---

## `Utils.TypingTools`

Type hints para uso consistente:

```python
from Utils.TypingTools import EventType, ConnType, APIResponseType

class Profile:
    def __init__(self, db: ConnType):
        self.db: ConnType = db

    def get_profiles(self, event: EventType) -> APIResponseType:
        ...
        return {"statusCode": 200, "data": records}
```

---

## Helpers de AWS

Todos viven en `Utils/`. Importar bajo demanda:

| Módulo | Para qué |
|---|---|
| `Utils.S3Tools` | Subir/descargar/listar objetos en S3. |
| `Utils.SQSTools` | Enviar mensajes a colas SQS. |
| `Utils.SnsManager` | Publicar a tópicos SNS. |
| `Utils.SecretTool` | Leer secretos desde Secrets Manager. |
| `Utils.DynamoTools` | CRUD sobre DynamoDB (LSI, GSI, billing modes). |
| `Utils.CognitoManager` | Manipulación de usuarios Cognito. |

```python
from Utils.S3Tools import upload_file_to_s3
from Utils.SQSTools import send_sqs_message
from Utils.CognitoManager import CognitoManager
```

---

## `Constants.ErrorMessages`

Diccionarios centralizados de mensajes de error:

```python
from Constants.ErrorMessages import DB_ERROR_CODES
```

Cada repo de lógica además define sus propios mensajes en `<Repo>/Constants/ErrorMessages.py`:

```python
# Ej: Auth/Constants/ErrorMessages.py
ERROR_MESSAGE_PROFILE = {
    'generic400':       'Solicitud inválida.',
    'generic404':       'Perfil no encontrado.',
    'enoughargs':       'Argumentos insuficientes para actualizar.',
    'failrgstrauthgrp': 'Error al registrar grupos de autenticación.',
    ...
}
```

Y se importan al inicio del archivo de la clase:

```python
from Auth.Constants.ErrorMessages import ERROR_MESSAGE_PROFILE
ERROR_MESSAGE = ERROR_MESSAGE_PROFILE
```
