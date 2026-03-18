import { execSync } from "node:child_process";
import ora from "ora";
import { log } from "./logger.js";

function commandExists(cmd) {
  try {
    execSync(`command -v ${cmd}`, { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

function run(cmd, opts = {}) {
  return execSync(cmd, { stdio: "pipe", encoding: "utf-8", ...opts });
}

/**
 * Instala OpenSpec globalmente si no está presente.
 * Requiere Node >= 20.19.0
 */
export async function installOpenSpec() {
  if (commandExists("openspec")) {
    log.success("OpenSpec ya instalado");
    return true;
  }

  const spinner = ora("Instalando OpenSpec...").start();
  try {
    run("npm install -g @fission-ai/openspec@latest");
    spinner.succeed("OpenSpec instalado");
    return true;
  } catch (err) {
    spinner.fail("No se pudo instalar OpenSpec");
    log.error("Ejecuta manualmente: npm install -g @fission-ai/openspec@latest");
    return false;
  }
}

/**
 * Inicializa OpenSpec en el proyecto con soporte para Claude Code.
 */
export async function initOpenSpec(cwd) {
  const spinner = ora("Inicializando OpenSpec en el proyecto...").start();
  try {
    run("openspec init --tools claude", { cwd });
    spinner.succeed("OpenSpec inicializado");
    return true;
  } catch (err) {
    spinner.fail("Error inicializando OpenSpec");
    log.warn("Ejecuta manualmente: openspec init --tools claude");
    return false;
  }
}

/**
 * Instala ruff si no está presente.
 * Intenta: curl installer → pipx → pip3
 */
export async function installRuff() {
  if (commandExists("ruff")) {
    log.success("ruff ya instalado");
    return true;
  }

  const spinner = ora("Instalando ruff...").start();

  // Intento 1: instalador oficial
  try {
    run("curl -LsSf https://astral.sh/ruff/install.sh | sh");
    spinner.succeed("ruff instalado");
    return true;
  } catch { /* continuar */ }

  // Intento 2: pipx
  if (commandExists("pipx")) {
    try {
      run("pipx install ruff");
      spinner.succeed("ruff instalado (via pipx)");
      return true;
    } catch { /* continuar */ }
  }

  // Intento 3: pip3
  if (commandExists("pip3")) {
    try {
      run("pip3 install ruff --break-system-packages");
      spinner.succeed("ruff instalado (via pip3)");
      return true;
    } catch { /* continuar */ }
  }

  spinner.fail("No se pudo instalar ruff");
  log.error("Ejecuta manualmente: curl -LsSf https://astral.sh/ruff/install.sh | sh");
  return false;
}

/**
 * Instala Beads si no está presente.
 * Intenta: brew → curl installer
 */
export async function installBeads() {
  if (commandExists("bd")) {
    log.success("Beads ya instalado");
    return true;
  }

  const spinner = ora("Instalando Beads...").start();

  // Intento 1: brew
  if (commandExists("brew")) {
    try {
      run("brew install beads");
      spinner.succeed("Beads instalado (via brew)");
      return true;
    } catch { /* continuar */ }
  }

  // Intento 2: curl
  try {
    run("curl -fsSL https://raw.githubusercontent.com/steveyegge/beads/main/scripts/install.sh | bash");
    spinner.succeed("Beads instalado");
    return true;
  } catch { /* continuar */ }

  spinner.fail("No se pudo instalar Beads");
  log.warn("Beads es opcional. Instala manualmente si necesitas memoria persistente entre sesiones.");
  return false;
}

/**
 * Inicializa Beads en el proyecto.
 */
export async function initBeads(cwd) {
  if (!commandExists("bd")) return false;

  const spinner = ora("Inicializando Beads...").start();
  try {
    run("bd init --quiet", { cwd });
    run("bd setup claude", { cwd });
    spinner.succeed("Beads inicializado");
    return true;
  } catch {
    spinner.warn("Beads init falló (puede que ya esté inicializado)");
    return false;
  }
}
