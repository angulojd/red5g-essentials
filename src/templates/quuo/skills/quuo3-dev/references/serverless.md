# Referencia: serverless.yml

## Sección `custom` estándar

Copiar esta sección en cada nuevo repo de lógica. Los valores con `${env:...}`
vienen del archivo `.env` correspondiente al stage.

```yaml
custom:
  prune:
    automatic: true
    includeLayers: true
    number: 3

  pythonRequirements:
    fileName: requirements.txt
    useDownloadCache: false
    useStaticCache: false
    invalidateCaches: true
    layer: true
    slim: true
    strip: false
    slimPatternsAppendDefaults: false
    slimPatterns:
      - numpy/**
      - numpy.libs/**
      - boto3/**
      - botocore/**
      - s3transfer/**
      - urllib3/**
      - mysql/vendor/**
      - "**/*.py[c|o]"
      - "**/__pycache__*"
    pipCmdExtraArgs:
      - --no-deps

  scriptable:
    hooks:
      package:createDeploymentArtifacts:
        - python3.12 -m compileall -f -q --invalidation-mode=unchecked-hash .serverless/requirements/ || true

  associateWaf:
    name: ${env:WAF_NAME}
    version: ${env:WAF_VERSION}

  # CORE secrets
  SECRET_ID_ROOT: ${env:SECRET_ROOT}
  SECRET_ID_CORE: ${env:SECRET_CORE}
  SECRET_CORE: ${ssm:/aws/reference/secretsmanager/${self:custom.SECRET_ID_CORE}}
  COGNITO_USER_POOL_ID: ${self:custom.SECRET_CORE.USER_POOL}

  # Stage y prefix
  stage: ${sls:stage}
  prefix: ${cf(${aws:region}):aws-quuo-common-${self:custom.stage}.FPrefix}
  common: ${self:custom.prefix}common-${self:custom.stage}

  # Authorizer Cognito
  authorizerConfig:
    name: CognitoUserPoolAuthorizer
    type: COGNITO_USER_POOLS
    arn: "arn:aws:cognito-idp:${aws:region}:${aws:accountId}:userpool/${self:custom.SECRET_CORE.USER_POOL}"
    identitySource: method.request.header.Authorization

  # Timeouts y memoria
  globalTimeOut: 30
  SQSglobalTimeOut: 900
  memorySize: 1024

  # Buckets
  CORE_BUCKET: ${self:custom.SECRET_CORE.core_bucket}
  CORE_BUCKET_LOG: logs_${self:custom.stage}

  # CORS
  cors:
    origin: "*"
    headers:
      - Content-Type
      - X-Amz-Date
      - Authorization
      - X-Api-Key
      - X-Amz-Security-Token
      - X-Amz-User-Agent
      - Access-Control-Allow-Headers
      - Accept
      - Accept-Language
      - Content-Language
      - Access-Control-Allow-Origin
      - Access-Control-Allow-Methods
      - Access-Control-Allow-Credentials
```

---

## Registro de una función Lambda

### Endpoint HTTP estándar

```yaml
functions:
  NombreLogico:
    name: ${self:custom.prefix}Nombre-Descriptivo-${self:custom.stage}
    handler: handlers/NombreHandler.nombre_funcion
    timeout: ${self:custom.globalTimeOut}
    memorySize: ${self:custom.memorySize}
    events:
      - http:
          path: /ruta-del-endpoint
          method: GET   # GET | POST | PUT | DELETE | PATCH
          authorizer: ${self:custom.authorizerConfig}
          cors: ${self:custom.cors}
```

### Lambda asíncrona (SQS trigger)

```yaml
  NombreLogicoAsync:
    name: ${self:custom.prefix}Nombre-Async-${self:custom.stage}
    handler: handlers/NombreHandler.nombre_funcion_async
    timeout: ${self:custom.SQSglobalTimeOut}
    memorySize: ${self:custom.memorySize}
    events:
      - sqs:
          arn: !GetAtt MiCola.Arn
          batchSize: 1
```

### Lambda sin evento HTTP (invocación directa / cronjob)

```yaml
  NombreLogicoCron:
    name: ${self:custom.prefix}Nombre-Cron-${self:custom.stage}
    handler: handlers/NombreHandler.nombre_funcion_cron
    timeout: ${self:custom.globalTimeOut}
    memorySize: ${self:custom.memorySize}
```

---

## Variables de entorno en serverless.yml

```yaml
provider:
  name: aws
  runtime: python3.12
  environment:
    # Variables de negocio desde .env
    MAIL_URL: ${env:MAIL_URL}
    SOME_API_KEY: ${env:SOME_API_KEY}
    # Variables de core (disponibles en todos los repos)
    SECRET_ROOT: ${env:SECRET_ROOT}
    SECRET_CORE: ${env:SECRET_CORE}
```

---

## Convenciones de naming en serverless.yml

- **Nombre lógico** (clave en `functions:`): `PascalCase` sin guiones. Ej: `SendMailsGeneral`.
- **`name`** (nombre real en AWS): usa el prefix + descripción con guiones + stage. Ej: `${self:custom.prefix}Send-Mails-General-${self:custom.stage}`.
- **`handler`**: ruta del archivo + nombre exacto de la función Python. Ej: `handlers/SendMailHandler.send_mail_general`.
- **`path`** del evento HTTP: kebab-case. Ej: `/send-mail-general`.
