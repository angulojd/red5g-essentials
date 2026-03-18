import { confirm } from "@inquirer/prompts";
import chalk from "chalk";
import {
  existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { log } from "../utils/logger.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLUGIN_DIR = join(__dirname, "..", "plugin");

function copyDir(srcDir, destDir) {
  if (!existsSync(srcDir)) return 0;
  mkdirSync(destDir, { recursive: true });
  let count = 0;

  for (const entry of readdirSync(srcDir, { withFileTypes: true })) {
    const src = join(srcDir, entry.name);
    const dest = join(destDir, entry.name);
    if (entry.isDirectory()) {
      count += copyDir(src, dest);
    } else {
      writeFileSync(dest, readFileSync(src));
      count++;
    }
  }
  return count;
}

export async function updateCommand(options) {
  log.header("red5g update");

  const cwd = process.cwd();
  const claudeDir = join(cwd, ".claude");

  if (!existsSync(claudeDir)) {
    log.error("No se encontró .claude/ en este directorio.");
    log.info("¿Querías ejecutar " + chalk.cyan("npx @red5g/cli init") + "?");
    process.exit(1);
  }

  // ─── Confirmar ───
  if (!options.force) {
    log.info("Esto sobrescribirá commands, agents, skills y hooks en .claude/");
    log.info("NO toca CLAUDE.md, pyproject.toml, ni archivos de tu proyecto.");
    log.blank();
    const proceed = await confirm({ message: "¿Continuar?", default: true });
    if (!proceed) {
      log.warn("Cancelado.");
      process.exit(0);
    }
  }

  // ─── Actualizar plugin ───
  const cmdCount = copyDir(join(PLUGIN_DIR, "commands"), join(claudeDir, "commands"));
  const agentCount = copyDir(join(PLUGIN_DIR, "agents"), join(claudeDir, "agents"));
  const skillCount = copyDir(join(PLUGIN_DIR, "skills"), join(claudeDir, "skills"));
  const hookCount = copyDir(join(PLUGIN_DIR, "hooks"), join(claudeDir, "hooks"));

  log.success(`Actualizado: ${cmdCount} commands, ${agentCount} agents, ${skillCount} skills, ${hookCount} hooks`);

  // ─── Verificar/reparar settings.json hooks ───
  const settingsPath = join(claudeDir, "settings.json");
  if (existsSync(settingsPath)) {
    try {
      const settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
      const correctHook = {
        matcher: "Write|Edit|MultiEdit",
        hooks: [
          {
            type: "command",
            command: "python3 .claude/hooks/ruff-gate.py",
          },
        ],
      };

      settings.hooks = settings.hooks || {};
      const ptu = settings.hooks.PostToolUse;

      // Detect missing or old format (has "command" at top level instead of nested hooks array)
      const needsFix = !ptu
        || !Array.isArray(ptu)
        || ptu.length === 0
        || (ptu[0] && !ptu[0].hooks);

      if (needsFix) {
        settings.hooks.PostToolUse = [correctHook];
        writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
        log.success("Hook ruff-gate reparado en settings.json");
      }
    } catch {
      log.warn("No se pudo leer settings.json — verifica manualmente");
    }
  }

  // ─── Recordatorio ───
  log.blank();
  console.log(chalk.dim("  Para actualizar Essentials (dentro de Claude Code):"));
  console.log(chalk.dim("  /plugin marketplace update"));
  console.log(chalk.dim("  /plugin update essentials@essentials-claude-code"));
  log.blank();
  log.success("Plugin red5g actualizado");
}
