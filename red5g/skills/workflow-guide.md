---
name: workflow-guide
description: "Development workflow guide for the team. Explains when and how to use OpenSpec (planning), Essentials (execution with exit criteria), and Beads (persistent memory). Auto-activates when user asks about workflow, planning, or task management."
---

# Guía de Workflow — OpenSpec + Essentials + Beads

## Flujo Rápido (80% de tareas)

Para bugs, fixes, o tareas discutidas en el chat:
```
/implement-loop <descripción de la tarea>
```
Essentials implementa, corre tests, y loopea hasta que los exit criteria pasen. Para tareas paralelas independientes usa `/implement-swarm`. Para builds multi-componente usa `/implement-team`.

## Flujo con Plan (Features medianas)

```
1. /plan-creator <descripción del feature>
2. /plan-loop .claude/plans/<plan>.md       # o /plan-swarm o /plan-team
```

## Flujo con Specs (Features que necesitan diseño arquitectónico)

```
1. /opsx:propose <nombre>                  # OpenSpec planifica
2. /plan-creator <descripción>             # Essentials genera plan con exit criteria
3. /plan-loop .claude/plans/<plan>.md      # Essentials ejecuta
4. /opsx:archive                           # OpenSpec archiva
```

## Flujo Multi-Sesión (Features grandes, >1 día)

```
1. /opsx:propose <nombre>                  # OpenSpec planifica
2. /plan-creator <descripción>             # Essentials genera plan
3. /beads-converter .claude/plans/<plan>.md # Convierte a Beads
4. /beads-loop                             # Ejecuta con persistencia
5. /opsx:archive                           # Archiva al completar
```
Beads persiste entre sesiones. Si se corta, `bd ready` muestra dónde quedaste.

## Regla de Auditoría

ANTES de cerrar cualquier tarea, delega al agente `code-auditor` para revisar los archivos `.py` modificados. No marques como completa hasta veredicto ✅.

## Cuándo usar cada modo

| Situación | Comando |
|-----------|---------|
| Fix rápido discutido en chat | `/implement-loop` |
| Feature con plan | `/plan-loop` o `/plan-swarm` |
| Feature con specs arquitectónicas | OpenSpec + `/plan-loop` |
| Feature >1 sesión | OpenSpec + `/beads-converter` + `/beads-loop` |
| Tareas paralelas independientes | `/plan-swarm` o `/beads-swarm` |
| Build multi-componente (frontend+backend+db) | `/plan-team` |
