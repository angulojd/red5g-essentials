# Referencia: Cronjobs (quuo-cronjob)

## Origen

`quuo-cronjob` es el repo base que provee el `CronManager` y el patrón
estándar para Lambdas disparadas por EventBridge. Instalado como `quuo-cronjob`.

```python
from CronJob.Classes.CronManager import CronManager
```

> El `package_dir` mapea `Classes/` → `CronJob.Classes`.

---

## Estructura del repo

```
quuo-cronjob/
├── Classes/
│   └── CronManager.py
├── handlers/
│   └── TriggerHandler.py
├── requirements/
├── setup.py
└── serverless.yml
```

---

## El patrón de cronjob NO usa `@authorized`

Los handlers de cronjob usan `@response_format` (de `Utils.Response` en
quuo-common), porque EventBridge invoca sin contexto Cognito y sin company
extraíble del token. La company se especifica explícitamente en el evento
de EventBridge.

```python
from CronJob.Classes.CronManager import CronManager
from DataBase.db import Database
from Utils.Response import response_format


@response_format
def handler(event, context):
    cron_id = event.get('cron_id', 0)
    order = event.get('order', 1)

    db = Database()
    cm = CronManager(db, cron_id, order)
    data = cm.trigger_cron_lambdas()

    return {"statusCode": 200, "data": data}
```

---

## `CronManager`

Clase que orquesta el disparo de Lambdas para todas las companies autorizadas
para un cronjob específico.

### Constructor

```python
CronManager(db, cron_id=0, order=1)
```

| Parámetro | Tipo | Descripción |
|---|---|---|
| `db` | `Database` | Manager de conexión (instanciado en el handler). |
| `cron_id` | `int` | ID del cronjob en la tabla `cron_jobs`. |
| `order` | `int` | Orden de ejecución dentro del cronjob (default 1). |

### Métodos públicos

```python
cm.trigger_cron_lambdas() -> list
# 1. Llama a fetch_companies() para obtener companies autorizadas.
# 2. Para cada company, invoca async una Lambda con los datos del cronjob.
# 3. Retorna una lista con los resultados de las invocaciones.

cm.fetch_companies() -> list
# Query a DB cruzando CronJobModel + CompanyCodeModel + CronAuthModel,
# filtrando por cron_id y registros activos.

cm.trigger(event, instance_type, method) -> APIResponseType
# Ejecuta un método custom en una instancia del tipo pasado.
# Útil cuando el cronjob no es solo "disparar Lambdas" sino lógica directa.
```

---

## Cómo registrar un cronjob en serverless.yml

```yaml
functions:
  TriggerExampleCron:
    name: ${self:custom.prefix}Trigger-Example-Cron-${self:custom.stage}
    handler: handlers/TriggerHandler.handler
    timeout: ${self:custom.SQSglobalTimeOut}      # los crons usan timeout largo
    memorySize: ${self:custom.memorySize}
    events:
      - schedule:
          rate: cron(0 5 * * ? *)                 # cada día a las 5 AM UTC
          enabled: true
          input:
            cron_id: 1
            order: 1
```

`input` define los datos que llegan al `event` del handler.

---

## Patrón típico para Lambdas async invocadas por el cron

`trigger_cron_lambdas()` invoca **otras Lambdas async**, una por company.
Esas Lambdas async usan `@multi_source(authorized_=False)` (porque vienen
de invocación directa de Lambda, no de API Gateway), y reciben en el `body`
los datos del cronjob + el `company_code` para inicializar `conn`.

```python
# handlers/ProcessCronTaskHandler.py
from Auth.Utils.EventTools import multi_source
from Auth.Classes.MyCronTask import MyCronTask


@multi_source(authorized_=False)
def process_cron_task(event, context, conn):
    cls = MyCronTask(conn)
    return cls.run(event)
```

---

## Lo que NO hacer

```python
# Mal: usar @authorized en un handler de cronjob (no hay token Cognito)
@authorized
def cron_handler(event, context, conn):    # NUNCA
    ...

# Mal: instanciar CronManager sin db
cm = CronManager(cron_id=1)                 # NUNCA — db es requerido

# Mal: hardcodear la lista de companies
for company in ["company1", "company2"]:    # NUNCA — usar fetch_companies()
    ...
```
