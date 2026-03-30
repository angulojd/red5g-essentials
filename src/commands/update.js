import { confirm } from "@inquirer/prompts";
import chalk from "chalk";
import {
  existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, rmSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
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
    log.info("¿Querías ejecutar " + chalk.cyan("npx @red5g/cli@latest init") + "?");
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

  // ─── Refrescar OpenSpec (ANTES del plugin para que podamos sobrescribir /opsx:*) ───
  try {
    execSync("command -v openspec", { stdio: "pipe" });
    if (existsSync(join(cwd, "openspec"))) {
      log.info("Refrescando comandos de OpenSpec...");
      execSync("openspec init --tools claude", { cwd, stdio: "pipe" });
      log.success("OpenSpec refrescado");
    }
  } catch {
    log.warn("OpenSpec no disponible — se omite refresco de /opsx:*");
  }

  // ─── Copiar plugin red5g (sobrescribe /opsx:* con nuestras versiones) ───
  const cmdCount = copyDir(join(PLUGIN_DIR, "commands"), join(claudeDir, "commands"));
  const agentCount = copyDir(join(PLUGIN_DIR, "agents"), join(claudeDir, "agents"));
  const skillCount = copyDir(join(PLUGIN_DIR, "skills"), join(claudeDir, "skills"));
  const hookCount = copyDir(join(PLUGIN_DIR, "hooks"), join(claudeDir, "hooks"));

  log.success(`Actualizado: ${cmdCount} commands, ${agentCount} agents, ${skillCount} skills, ${hookCount} hooks`);

  // ─── Limpiar skills duplicadas de OpenSpec ───
  const skillsDir = join(claudeDir, "skills");
  if (existsSync(skillsDir)) {
    for (const entry of readdirSync(skillsDir, { withFileTypes: true })) {
      if (entry.isDirectory() && entry.name.startsWith("openspec-")) {
        try {
          rmSync(join(skillsDir, entry.name), { recursive: true, force: true });
        } catch { /* ignorar si falla */ }
      }
    }
  }

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

  // ─── Crear directorios que pueden faltar en proyectos v2 ───
  mkdirSync(join(claudeDir, "fixes"), { recursive: true });
  mkdirSync(join(cwd, "openspec", "specs"), { recursive: true });
  mkdirSync(join(cwd, "openspec", "changes", "archive"), { recursive: true });

  log.blank();
  log.success("Plugin red5g actualizado");
}
