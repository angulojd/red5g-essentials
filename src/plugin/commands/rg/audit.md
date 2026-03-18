---
name: audit
description: "Run code quality audit on Python files. Delegates to the code-auditor agent."
---

Ejecuta una auditoría de calidad sobre los archivos Python especificados.

## Uso

```
/rg:audit <archivo_o_carpeta>
```

## Comportamiento

1. Si se pasa un archivo `.py`, audita solo ese archivo.
2. Si se pasa una carpeta, audita todos los `.py` dentro.
3. Si no se pasa argumento, audita todos los archivos `.py` modificados en git (`git diff --name-only --diff-filter=ACMR HEAD`).

## Ejecución

Delega al agente `code-auditor` pasando los archivos identificados. El agente genera un reporte estructurado con veredicto de commit.

**Instrucción:** Invoca el agente `code-auditor` con los archivos que el usuario especificó. Si no especificó archivos, primero ejecuta `git diff --name-only --diff-filter=ACMR HEAD` para obtener los archivos `.py` modificados, luego pásalos al agente.
