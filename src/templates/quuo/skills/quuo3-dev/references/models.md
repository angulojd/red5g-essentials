# Referencia: Modelos SQLAlchemy (quuo-models)

## Origen

Todos los modelos están en el repo **quuo-models**, instalado como `quuo-models`.
**Nunca definir modelos dentro de un repo de lógica.**

El paquete usa el prefijo de import **`BaseModels.`** (NO `Models.`):

```python
from BaseModels.Auth.Profile import ProfileModel
from BaseModels.User.User import UserModel
from BaseModels.Loans.Loan import LoanModel
```

> El `package_dir` en `quuo-models/setup.py` mapea cada carpeta de dominio
> (ej: `Auth/`, `User/`, `Loans/`) a un paquete Python `BaseModels.<Dominio>`.
> No existe una carpeta intermedia llamada `Models/`.

---

## Convención de nombres

| Elemento | Convención | Ejemplo |
|---|---|---|
| Carpeta del módulo | `PascalCase` del dominio | `Auth/`, `User/`, `Loans/` |
| Archivo del modelo | `PascalCase` de la entidad | `Profile.py`, `Loan.py` |
| Clase del modelo | Entidad + sufijo `Model` | `ProfileModel`, `LoanModel` |
| Tabla SQL | `snake_case` plural o singular | `profiles`, `loans` |
| Primary key | `<entidad>_id` | `profile_id`, `loan_id`, `user_id` |

> ⚠️ La PK NUNCA es solo `id`. Siempre usa el patrón `<entidad>_id`.

---

## Base centralizado

**Sí, existe un `Base` compartido.** Todos los modelos importan el mismo:

```python
# En quuo-models/DataBase/Base.py
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()
```

**Importación en cualquier modelo:**

```python
from BaseModels.DataBase.Base import Base
```

> ⚠️ NUNCA hagas `Base = declarative_base()` dentro de cada archivo de modelo.
> Eso crearía múltiples bases independientes y rompería las relationships.

---

## Estructura de un modelo (ejemplo real)

Archivo: `quuo-models/Assurance/TypeOfInsurer.py`

```python
from BaseModels.DataBase.Base import Base
from sqlalchemy import Column, Integer, DateTime, String
from sqlalchemy.sql.functions import current_timestamp


ST_NAME_MAX_LEN = 45


class TypeOfInsurerModel(Base):
    """
    Model representing the entity and properties.
    """
    __tablename__ = "type_of_insurer"

    type_of_insurer_id = Column(Integer, primary_key=True)
    name = Column(String(ST_NAME_MAX_LEN))
    created_at = Column(DateTime, default=current_timestamp())
    updated_at = Column(
        DateTime, default=current_timestamp(), onupdate=current_timestamp()
    )
    active = Column(Integer, server_default=str(1))

    def __init__(self, **kwargs):
        """
        Constructor defined for the entity column.
        """
        self.name = kwargs["name"]
```

### Convenciones obligatorias de columnas

- **PK**: `<entidad>_id`, `Integer`, `primary_key=True`
- **`created_at`**: `DateTime, default=current_timestamp()`
- **`updated_at`**: `DateTime, default=current_timestamp(), onupdate=current_timestamp()`
- **`active`**: `Integer, server_default=str(1)` (soft-delete por defecto)
- **FKs**: `<entidad_origen>_id`, `Integer`, `ForeignKey('<tabla>.<entidad>_id')`
- **Constants de longitud máxima**: declaradas como `UPPER_SNAKE_CASE` arriba de la clase (`DES_MAX_LEN`, `ST_NAME_MAX_LEN`, etc.). Estas constantes a menudo se exportan junto al modelo:

```python
from BaseModels.Auth.Profile import ProfileModel, DES_MAX_LEN
```

---

## Importación en repos de lógica

```python
from BaseModels.Auth.Profile import ProfileModel
from BaseModels.User.User import UserModel
from BaseModels.Loans.Loan import LoanModel
from BaseModels.Customers.Customer import CustomerModel
```

---

## Uso con SQLAlchemy (construcción de queries)

```python
from sqlalchemy import select, insert, update
from BaseModels.Management.Management import ManagementModel
from Utils.TypingTools import EventType, ConnType, APIResponseType


class Management:
    def __init__(self, db: ConnType):
        self.db: ConnType = db

    def get_managements(self, event: EventType) -> APIResponseType:
        company_id = event['company_id']
        stmt = (
            select(ManagementModel)
            .where(
                ManagementModel.company_id == company_id,
                ManagementModel.active == 1,
            )
        )
        records = self.db.read_session.query(stmt).as_dict()
        return {"statusCode": 200, "data": records}

    def create_management(self, event: EventType) -> APIResponseType:
        body = event.get('body') or {}
        management_id = self.db.write_session.add(
            insert(ManagementModel).values(
                company_id=event['company_id'],
                name=body['name'],
            )
        )
        return {"statusCode": 201, "data": {"management_id": management_id}}
```

---

## Carpetas de dominio (módulos) en quuo-models

`quuo-models` contiene ~43 módulos de dominio. Los principales:

`Auth, Admin, AdminVistas, Loans, User, Customers, Company, Product, Management,
Document, Assurance, Borrower, Agreements, Resources, Disbursement, Calculate,
Costs, Homologations, PassiveAccount, PassiveAccountDocument,
PassiveAccountAssurance, PassiveAccountDeny, Parametros, Allies, Ado, Xtremo,
RulesEngine, KnowyViews, ServiceMotor, CompanyCreation, ElectronicSign,
ValidacionIdentidad, Pagaduria, ValOlimpia, DataBase, Variables, Fields, Deny,
CronJob, LoanPurchase, ExpertManagement, ProductRules, Subsanacion,
RiskCenterDocumentComfandi, DecevalComfandi, AdoComfandi, SabanaDatos`

Algunas carpetas contienen un único archivo (ej: `Admin/Admin.py`),
otras contienen varios modelos relacionados (ej: `Assurance/` con
`InsurerModel`, `InsuranceLoanRelationshipModel`, `PolicyLoanRelationshipModel`,
`TypeOfInsurer`, etc.).

---

## Antes de usar un modelo

1. **Verificar que existe** en `quuo-models/<Dominio>/`. Hacer `ls` o `find`.
2. **Si no existe**, NO crearlo en el repo de lógica — coordinarlo para que se agregue al repo de modelos.
3. El nombre del paquete de importación siempre empieza con `BaseModels.`.
4. Verificar el nombre exacto de la clase: por convención es `<EntidadEnPascalCase>Model`, pero algunos archivos rompen esa regla (ej: `TypeOfInsurer.py` → clase `TypeOfInsurerModel`).
