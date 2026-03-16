#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────
# setup.sh — Inicializa un proyecto nuevo con el stack completo:
#   OpenSpec + Essentials + Beads + red5g-essentials plugin
#
# Uso:
#   curl -fsSL <url>/setup.sh | bash
#   o
#   ./setup.sh
#
# Prerrequisitos: Node.js 20.19+, Claude Code v2.1.19+, Git
# ─────────────────────────────────────────────────────────

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

info()  { echo -e "${BLUE}[INFO]${NC}  $1"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
fail()  { echo -e "${RED}[FAIL]${NC}  $1"; exit 1; }

# ── Verificar prerrequisitos ─────────────────────────────

info "Verificando prerrequisitos..."

command -v node  >/dev/null 2>&1 || fail "Node.js no encontrado. Instala v20.19+."
command -v npm   >/dev/null 2>&1 || fail "npm no encontrado."
command -v git   >/dev/null 2>&1 || fail "Git no encontrado."
command -v claude >/dev/null 2>&1 || fail "Claude Code no encontrado. Instala desde https://claude.ai/code"

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    fail "Node.js $NODE_VERSION encontrado. Se requiere v20+."
fi

ok "Prerrequisitos verificados"

# ── Instalar herramientas globales ───────────────────────

info "Instalando OpenSpec..."
if command -v openspec >/dev/null 2>&1; then
    ok "OpenSpec ya instalado ($(openspec --version 2>/dev/null || echo 'version desconocida'))"
else
    npm install -g @fission-ai/openspec@latest
    ok "OpenSpec instalado"
fi

info "Instalando Beads (bd)..."
if command -v bd >/dev/null 2>&1; then
    ok "Beads ya instalado ($(bd version 2>/dev/null || echo 'version desconocida'))"
else
    if command -v brew >/dev/null 2>&1; then
        brew install beads
    else
        curl -fsSL https://raw.githubusercontent.com/steveyegge/beads/main/scripts/install.sh | bash
    fi
    ok "Beads instalado"
fi

info "Verificando ruff..."
if command -v ruff >/dev/null 2>&1; then
    ok "ruff ya instalado ($(ruff --version))"
else
    warn "ruff no encontrado. Instalando..."
    pip install ruff --break-system-packages 2>/dev/null || pip install ruff
    ok "ruff instalado"
fi

# ── Inicializar proyecto ─────────────────────────────────

info "Inicializando OpenSpec en el proyecto..."
if [ -d "openspec" ]; then
    ok "OpenSpec ya inicializado"
else
    openspec init --tools claude
    ok "OpenSpec inicializado"
fi

info "Inicializando Beads en el proyecto..."
if [ -d ".beads" ]; then
    ok "Beads ya inicializado"
else
    bd init --quiet
    bd setup claude
    ok "Beads inicializado con integración Claude Code"
fi

# ── Crear estructura de carpetas ─────────────────────────

info "Creando estructura de carpetas..."
mkdir -p .claude/plans .claude/prompts .claude/prd .claude/agent-memory/code-auditor

# ── Crear settings.json si no existe ────────────────────

SETTINGS_FILE=".claude/settings.json"
if [ ! -f "$SETTINGS_FILE" ]; then
    info "Creando settings.json..."
    cat > "$SETTINGS_FILE" << 'SETTINGS'
{
  "permissions": {
    "allow": [
      "bd *",
      "openspec *",
      "ruff *",
      "gh *"
    ]
  },
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
SETTINGS
    ok "settings.json creado"
else
    ok "settings.json ya existe"
fi

# ── Crear pyproject.toml si no existe ───────────────────

if [ ! -f "pyproject.toml" ]; then
    info "Creando pyproject.toml con config de ruff..."
    cat > "pyproject.toml" << 'PYPROJECT'
[tool.ruff]
line-length = 100
target-version = "py311"

[tool.ruff.lint]
select = [
    "E",    # pycodestyle errors
    "W",    # pycodestyle warnings
    "F",    # pyflakes
    "I",    # isort
    "B",    # flake8-bugbear
    "SIM",  # flake8-simplify
    "C90",  # mccabe complexity
    "UP",   # pyupgrade
    "ARG",  # flake8-unused-arguments
    "RET",  # flake8-return
    "BLE",  # flake8-blind-except
    "S",    # flake8-bandit (security)
]

[tool.ruff.lint.mccabe]
max-complexity = 10
PYPROJECT
    ok "pyproject.toml creado"
else
    ok "pyproject.toml ya existe"
fi

# ── Crear CLAUDE.md template si no existe ────────────────

if [ ! -f "CLAUDE.md" ]; then
    info "Creando CLAUDE.md template..."
    cat > "CLAUDE.md" << 'CLAUDEMD'
# 🤖 Guía de Desarrollo — [NOMBRE DEL PROYECTO]

> **EDITA ESTE ARCHIVO** con la información específica de tu proyecto.
> Las reglas globales de código se inyectan automáticamente via el plugin red5g-essentials.

## 🏗️ Arquitectura
- **Infraestructura:** 100% Serverless (AWS Lambda, [SQS/SNS], [DynamoDB/MySQL]).
- **Despliegue:** Serverless Framework (`serverless.yml` con `serverless-python-requirements`).
- **Patrón de Eventos:** [Describe tu patrón: API Gateway → Lambda, Webhook → SQS → Lambda, etc.]

## 🔧 Servicios Externos
- [Lista los servicios: Twilio, Stripe, etc.]
- [Configuración en `config.py` via pydantic-settings]

## 📐 Reglas de Negocio Específicas
- [Reglas del dominio que el agente debe respetar]
- [Validaciones específicas del proyecto]
- [Límites y restricciones del negocio]

## 🗄️ Base de Datos
- **Motor:** [DynamoDB / MySQL / PostgreSQL]
- **Patrones:** [Describe patrones de acceso, índices clave, etc.]
- [Si usa DynamoDB: patrón de concurrencia con `is_processing`, single-table design, etc.]
- [Si usa MySQL: migraciones, ORM/raw SQL, connection pooling, etc.]

## 🔒 Seguridad Específica
- [Reglas de seguridad del dominio]
- [Si hay IA: blindaje de inyección de prompt en SystemMessage]
- [Validaciones de input específicas]

## 📝 Notas para la IA
- [Skills específicas del proyecto que debe usar]
- [Archivos clave que debe leer antes de implementar]
- [Patrones recurrentes del proyecto]
CLAUDEMD
    ok "CLAUDE.md template creado"
else
    ok "CLAUDE.md ya existe"
fi

# ── Crear AGENTS.md si no existe ─────────────────────────

if [ ! -f "AGENTS.md" ]; then
    info "Creando AGENTS.md..."
    cat > "AGENTS.md" << 'AGENTSMD'
# Instrucciones para Agentes

Este proyecto usa `bd` (beads) para tracking de tareas.

## Workflow
1. Al inicio de cada sesión: `bd ready --json` para ver trabajo disponible.
2. Reclama tareas con `bd update <id> --claim`.
3. Implementa, testea, audita con `code-auditor`.
4. Cierra con `bd close <id> --reason "descripción del cambio"`.
5. Crea issues para trabajo descubierto durante implementación.
AGENTSMD
    ok "AGENTS.md creado"
else
    ok "AGENTS.md ya existe"
fi

# ── Resumen ──────────────────────────────────────────────

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  ✅ Proyecto inicializado correctamente${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "  Herramientas instaladas:"
echo "    ✓ OpenSpec  — planificación SDD"
echo "    ✓ Beads     — memoria persistente entre sesiones"
echo "    ✓ ruff      — linting + formateo"
echo ""
echo "  Estructura creada:"
echo "    ✓ openspec/          — specs del proyecto"
echo "    ✓ .beads/            — base de datos Beads"
echo "    ✓ .claude/plans/     — planes de Essentials"
echo "    ✓ .claude/settings.json"
echo "    ✓ pyproject.toml     — config ruff (line-length=100)"
echo "    ✓ CLAUDE.md          — EDÍTALO con info del proyecto"
echo "    ✓ AGENTS.md          — instrucciones para agentes"
echo ""
echo "  Próximos pasos:"
echo "    1. Edita CLAUDE.md con la info de tu proyecto"
echo "    2. Abre Claude Code: claude"
echo "    3. Instala plugins:"
echo "       /plugin marketplace add GantisStorm/essentials-claude-code"
echo "       /plugin install essentials@essentials-claude-code"
echo "       /plugin marketplace add red5g/red5g-essentials"
echo "       /plugin install red5g-essentials"
echo ""
echo "    4. Empieza a trabajar:"
echo "       /implement-loop <tarea rápida>"
echo "       /plan-creator <feature con plan>"
echo ""
