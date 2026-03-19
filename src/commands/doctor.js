import chalk from "chalk";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { log } from "../utils/logger.js";

function commandExists(cmd) {
  try {
    execSync(`command -v ${cmd}`, { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

function getVersion(cmd) {
  try {
    return execSync(`${cmd} --version`, { stdio: "pipe", encoding: "utf-8" }).trim().split("\n")[0];
  } catch {
    return null;
  }
}

function check(label, fn) {
  try {
    const result = fn();
    log.success(`${label} ${chalk.dim(result || "")}`);
    return true;
  } catch (err) {
    log.error(`${label} ${chalk.dim(`— ${err.message}`)}`);
    return false;
  }
}

function countFiles(dir) {
  try {
    let count = 0;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        count += countFiles(join(dir, entry.name));
      } else if (entry.name.endsWith(".md") || entry.name.endsWith(".py")) {
        count++;
      }
    }
    return count;
  } catch {
    return 0;
  }
}

export async function doctorCommand() {
  log.header("red5g doctor");
  log.blank();

  const cwd = process.cwd();
  let passed = 0;
  let failed = 0;
  const inc = (ok) => ok ? passed++ : failed++;

  // ─── Herramientas globales ───
  console.log(chalk.bold("  Herramientas globales"));
  log.blank();

  inc(check("Node.js ≥20.19", () => {
    const ver = process.version;
    const [major, minor] = ver.slice(1).split(".").map(Number);
    if (major < 20 || (major === 20 && minor < 19)) {
      throw new Error(`Requiere ≥20.19.0, tienes ${ver}`);
    }
    return ver;
  }));

  inc(check("git", () => {
    if (!commandExists("git")) throw new Error("No instalado");
    return getVersion("git");
  }));

  inc(check("Claude Code", () => {
    if (!commandExists("claude")) throw new Error("No instalado → https://docs.anthropic.com/en/docs/claude-code");
    return getVersion("claude") || "instalado";
  }));

  inc(check("OpenSpec", () => {
    if (!commandExists("openspec")) throw new Error("No instalado → npm i -g @fission-ai/openspec");
    return getVersion("openspec") || "instalado";
  }));

  inc(check("ruff", () => {
    if (!commandExists("ruff")) throw new Error("No instalado → curl -LsSf https://astral.sh/ruff/install.sh | sh");
    return getVersion("ruff");
  }));

  inc(check("Beads (opcional)", () => {
    if (!commandExists("bd")) throw new Error("No instalado — solo para memoria persistente entre sesiones");
    return "instalado";
  }));

  inc(check("tmux (opcional)", () => {
    if (!commandExists("tmux")) throw new Error("No instalado — solo para /plan-team");
    return "instalado";
  }));

  // ─── Proyecto ───
  log.blank();
  console.log(chalk.bold("  Proyecto"));
  log.blank();

  inc(check("Repositorio git", () => {
    if (!existsSync(join(cwd, ".git"))) throw new Error("Ejecuta: git init");
    return "";
  }));

  inc(check("CLAUDE.md", () => {
    if (!existsSync(join(cwd, "CLAUDE.md"))) throw new Error("Ejecuta: npx @red5g/cli init");
    return "";
  }));

  inc(check("pyproject.toml", () => {
    if (!existsSync(join(cwd, "pyproject.toml"))) throw new Error("Ejecuta: npx @red5g/cli init");
    return "";
  }));

  inc(check("OpenSpec inicializado", () => {
    if (!existsSync(join(cwd, "openspec"))) throw new Error("Ejecuta: openspec init --tools claude");
    return "";
  }));

  inc(check("ClickUp MCP (.mcp.json)", () => {
    const mcpPath = join(cwd, ".mcp.json");
    if (!existsSync(mcpPath)) throw new Error("No encontrado — ejecuta: npx @red5g/cli init");
    return "";
  }));

  // ─── Plugin red5g ───
  log.blank();
  console.log(chalk.bold("  Plugin red5g"));
  log.blank();

  const claudeDir = join(cwd, ".claude");

  inc(check("Commands", () => {
    const n = countFiles(join(claudeDir, "commands"));
    if (n === 0) throw new Error("No encontrados — ejecuta: npx @red5g/cli init");
    return `${n} archivos`;
  }));

  inc(check("Agents", () => {
    const n = countFiles(join(claudeDir, "agents"));
    if (n === 0) throw new Error("No encontrados — ejecuta: npx @red5g/cli init");
    return `${n} archivos`;
  }));

  inc(check("Skills", () => {
    const n = countFiles(join(claudeDir, "skills"));
    if (n === 0) throw new Error("No encontrados — ejecuta: npx @red5g/cli init");
    return `${n} archivos`;
  }));

  inc(check("Hooks", () => {
    const n = countFiles(join(claudeDir, "hooks"));
    if (n === 0) throw new Error("No encontrados — ejecuta: npx @red5g/cli init");
    return `${n} archivos`;
  }));

  inc(check("settings.json", () => {
    if (!existsSync(join(claudeDir, "settings.json"))) throw new Error("No encontrado");
    return "";
  }));

  // ─── Resumen ───
  log.blank();
  const total = passed + failed;
  if (failed === 0) {
    log.success(chalk.bold(`Todo listo — ${passed}/${total} checks pasaron`));
  } else {
    log.warn(chalk.bold(`${passed}/${total} checks pasaron, ${failed} requieren atención`));
  }

  log.blank();
  console.log(chalk.dim("  Nota: El plugin Essentials se instala dentro de Claude Code:"));
  console.log(chalk.dim("  /plugin marketplace add GantisStorm/essentials-claude-code"));
  console.log(chalk.dim("  /plugin install essentials@essentials-claude-code"));
  log.blank();

  process.exit(failed > 0 ? 1 : 0);
}
