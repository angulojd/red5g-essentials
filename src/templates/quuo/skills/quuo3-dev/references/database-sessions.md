# Referencia: Conexión a Base de Datos

## Origen

La capa de DB está en el repo **quuo-common**, carpeta `DataBase/`:

- `db.py` — Manager `Database` (orquesta conexiones, lazy properties, secretos)
- `DataBase.py` — Clase de bajo nivel `DataBase` (compila y ejecuta SQL)
- `Layer.py`, `LayerRow.py` — Wrappers de resultados con `.as_dict()`, `.first()`, `.all()`

El paquete instalado es `quuo-common` y se importa **sin prefijo `Common.`**:

```python
from DataBase.db import Database              # Manager (raramente importado en clases de lógica)
from DataBase.DataBase import DataBase        # Clase low-level (uso interno del manager)
```

> En la práctica **nunca importas `Database` directamente** en un repo de lógica.
> La conexión llega siempre como `conn` desde el decorador.

---

## Cómo llega `conn` al código de lógica

El decorador `@authorized` (en `Auth/Utils/EventTools.py`) inyecta `conn` como
tercer parámetro del handler:

```python
@authorized
def my_handler(event, context, conn):
    cls = MyClass(conn)
    ...
```

### Lo que hace `@authorized` internamente

```python
# Producción
conn = Database()
auth = Authorization(conn)
conn = auth.check_resource_auth(event)    # valida permisos y configura sesiones
data = func(event, context, conn)

# Localhost
conn = Database(SECRET_ID_COMPANY)
event['user_id'] = 0
event['company_id'] = SECRET_ID_COMPANY
data = func(event, context, conn)
```

`Authorization.check_resource_auth(event)`:
1. Extrae el código de compañía del token Cognito (claim `custom:company_code`).
2. Inicializa las sesiones de la company correspondiente.
3. Verifica que el usuario tenga acceso al recurso.
4. Retorna el `conn` con sesiones de company listas.

---

## `Database` es un manager con propiedades lazy

`Database` (clase con D mayúscula, en `DataBase/db.py`) **no ejecuta queries
directamente**. Es un orquestador de sesiones que se inicializan al primer uso:

| Propiedad | Tipo | Para qué |
|---|---|---|
| `conn.read_session` | `DataBase` (lazy) | SELECT a la company actual |
| `conn.write_session` | `DataBase` (lazy) | INSERT / UPDATE / DELETE a la company actual |
| `conn.core_read` | `DataBase` (lazy) | SELECT a core (config, auth, catálogos) |
| `conn.core_write` | `DataBase` (lazy) | Escritura a core |
| `conn.root_conn` | `DataBase` (lazy) | Solo para creación de companies |

Las propiedades se cachean: una vez inicializadas, las llamadas siguientes
reusan la misma sesión.

---

## Patrón canónico: acceso directo a las sesiones

```python
from Utils.TypingTools import ConnType, EventType, APIResponseType

class Profile:
    def __init__(self, db: ConnType):
        self.db: ConnType = db
```

Los métodos acceden a las sesiones **directamente** vía `self.db.read_session`
y `self.db.write_session`. **No aliasar** en `__init__`:

```python
def get_profiles(self, event):
    records = self.db.read_session.query(stmt).as_dict()
    ...

def create_profile(self, event):
    new_id = self.db.write_session.add(insert(ProfileModel).values(**data))
    ...
```

> ⚠️ Algunas clases del repo (ej. `Profile.py`) usan aliasing local
> (`self.session = self.db.read_session`). **No es el patrón canónico** —
> es un atajo de esa clase específica. El patrón estándar es acceso directo.

---

## Patrón SQLAlchemy + DataBase (pymysql)

- **SQLAlchemy** se usa **solo para construir queries** (`select`, `insert`, `update`, `delete`).
- La ejecución se hace a través de los métodos de la sesión:
  - `session.query(stmt)` para SELECT
  - `w_session.add(stmt, many=False)` para INSERT
  - `w_session.update(stmt)` para UPDATE
  - `w_session.delete(stmt)` para DELETE

### SELECT — patrones reales

```python
from sqlalchemy import select
from BaseModels.Auth.Profile import ProfileModel

stmt = select(ProfileModel).filter_by(active=1)

# Lista completa como dicts
records = self.db.read_session.query(stmt).as_dict()        # → list[dict]

# Primer resultado como ORM object
record = self.db.read_session.query(stmt).first()           # → ProfileModel | None
record_dict = record.as_dict() if record else None

# Todos los rows como ORM objects (sin convertir)
records = self.db.read_session.query(stmt).all()            # → list[ProfileModel]
```

### INSERT

```python
from sqlalchemy import insert

# Insert simple — retorna el id insertado
profile_id = self.db.write_session.add(
    insert(ProfileModel).values(name="X", area_id=1, description="...")
)

# Insert bulk — retorna el conteo de filas insertadas
inserted_count = self.db.write_session.add(
    insert(ProfileModel).values(list_of_dicts), many=True
)
```

### UPDATE

```python
from sqlalchemy import update

# Soft delete (active = 0)
affected = self.db.write_session.update(
    update(ProfileModel)
    .where(
        ProfileModel.profile_id == pk,
        ProfileModel.active == 1,
    )
    .values(active=0)
)
# affected → int (filas afectadas)
```

### Multi-where con AND

```python
from sqlalchemy import select, and_

stmt = (
    select(ProfileModel)
    .where(and_(
        ProfileModel.active == 1,
        ProfileModel.area_id.in_([1, 2, 3]),
    ))
)
records = self.db.read_session.query(stmt).as_dict()
```

### Queries a core

Para acceder a tablas del schema **core** (config, auth, catálogos del sistema)
en vez de la company actual:

```python
result = self.db.core_read.query(stmt).as_dict()
self.db.core_write.add(insert(SomeModel).values(...))
```

---

## Paginación

Para endpoints de listado, usar `check_query_limit` para validar `limit`/`offset`:

```python
from Utils.GeneralTools import get_input_data
from Utils.Validations import check_query_limit

def get_items(self, event: EventType) -> APIResponseType:
    request = get_input_data(event)

    stmt = select(MyModel).filter_by(active=1)

    if request and request.get("limit", 0):
        limit = int(request["limit"])
        offset = int(request.get("offset", 0))
        limit, offset = check_query_limit(limit, offset)
        stmt = stmt.offset(offset).limit(limit)

    rows = self.db.read_session.query(stmt).as_dict()
    return {"statusCode": 200, "data": rows}
```

---

## Lo que NO hacer

```python
# Mal: instanciar Database dentro de una clase de lógica
from DataBase.db import Database
conn = Database()                                  # NUNCA

# Mal: llamar execute() directo sobre el manager
self.db.execute(query)                             # NUNCA — execute() vive en las sesiones

# Mal: usar session.execute() de SQLAlchemy puro
session.execute(query)                             # NUNCA en repos de lógica

# Mal: hardcodear IDs de secretos
conn = Database("mi-secreto-hardcodeado")          # NUNCA

# Mal: mezclar lecturas y escrituras en la misma sesión
self.db.read_session.add(insert(...))              # NUNCA — usar write_session

# Mal: aliasar las sesiones (no es el patrón canónico)
self.session = self.db.read_session                # NUNCA — acceder directo

# Mal: importar con prefijo Common.
from Common.DataBase.db import Database            # NUNCA — el package_dir mapea sin prefijo
```
