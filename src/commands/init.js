import { select, confirm } from "@inquirer/prompts";
import ora from "ora";
import chalk from "chalk";
import {
  existsSync, mkdirSync, cpSync, readFileSync, writeFileSync, readdirSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { log } from "../utils/logger.js";
import {
  installOpenSpec, initOpenSpec, installRuff, installBeads, initBeads,
} from "../utils/installer.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLUGIN_DIR = join(__dirname, "..", "plugin");
const TEMPLATES_DIR = join(__dirname, "..", "templates");

const TEMPLATES = {
  "backend-mysql": {
    name: "backend-mysql",
    description: "Python 3.13 + Serverless Framework v3 + AWS Lambda + MySQL + SQLAlchemy ORM",
    hasScaffold: true,
  },
  quuo: {
    name: "quuo",
    description: "Quuo 3 — repo de lógica (Python 3.12 + Serverless v3 + Lambda + Cognito + repos base)",
    hasScaffold: true,
    extraSkills: ["quuo3-dev"],
  },
  generic: {
    name: "generic",
    description: "Template vacío para configurar manualmente",
    hasScaffold: false,
  },
};

// Archivos del scaffold quuo que son SOLO para repos nuevos.
// En repos Quuo existentes (con código real) se omiten para no contaminar.
const QUUO_EXAMPLE_FILES = new Set([
  "Classes/ExampleClass.py",
  "handlers/ExampleHandler.py",
  "tests/test_example_class.py",
  "setup.py",
  "script.py",
  "serverless.yml",
  "bitbucket-pipelines.yml",
  "dependences.json",
  "requirements/requirements-dev.txt",
  "requirements/requirements-git.txt",
  "requirements/requirements-lock.txt",
  "requirements/dev.in",
  "requirements/lock.in",
  "requirements/readme.txt",
]);

/**
 * Heurística: detecta si el cwd ya es un repo Quuo con código real.
 * Cumple con ≥2 de 3 señales fuertes (setup.py, Classes/, serverless.yml).
 */
function isExistingQuuoRepo(cwd) {
  let signals = 0;
  if (existsSync(join(cwd, "setup.py"))) signals++;
  if (existsSync(join(cwd, "serverless.yml"))) signals++;
  const classesDir = join(cwd, "Classes");
  if (existsSync(classesDir)) {
    const hasRealCode = readdirSync(classesDir).some(
      (f) => f.endsWith(".py") && f !== "__init__.py",
    );
    if (hasRealCode) signals++;
  }
  return signals >= 2;
}

/**
 * Copia el scaffold de quuo respetando una lista de exclusión.
 * No sobrescribe archivos existentes. Devuelve {created, skipped}.
 */
function copyQuuoScaffold(scaffoldDir, destDir, skipFiles) {
  const result = { created: 0, skipped: 0 };

  function walk(srcSub, destSub, relPrefix) {
    if (!existsSync(srcSub)) return;
    mkdirSync(destSub, { recursive: true });

    for (const entry of readdirSync(srcSub, { withFileTypes: true })) {
      const src = join(srcSub, entry.name);
      const dest = join(destSub, entry.name);
      const rel = relPrefix ? `${relPrefix}/${entry.name}` : entry.name;

      if (entry.isDirectory()) {
        walk(src, dest, rel);
      } else {
        if (skipFiles.has(rel)) {
          result.skipped++;
          continue;
        }
        if (existsSync(dest)) {
          result.skipped++;
          continue;
        }
        writeFileSync(dest, readFileSync(src));
        result.created++;
      }
    }
  }

  walk(scaffoldDir, destDir, "");
  return result;
}

/**
 * Copia recursivamente todos los archivos de srcDir a destDir.
 * Crea destDir si no existe.
 */
function copyPluginFiles(srcDir, destDir) {
  if (!existsSync(srcDir)) return 0;
  mkdirSync(destDir, { recursive: true });
  let count = 0;

  for (const entry of readdirSync(srcDir, { withFileTypes: true })) {
    const src = join(srcDir, entry.name);
    const dest = join(destDir, entry.name);
    if (entry.isDirectory()) {
      count += copyPluginFiles(src, dest);
    } else {
      writeFileSync(dest, readFileSync(src));
      count++;
    }
  }
  return count;
}

export async function initCommand(options) {
  log.header("red5g init");

  const cwd = process.cwd();
  const totalSteps = options.skipTools ? 4 : 9;
  let step = 0;

  // ─── Paso 1: Git ───
  step++;
  log.step(step, totalSteps, "Verificando git...");

  if (!existsSync(join(cwd, ".git"))) {
    const shouldInit = options.yes || await confirm({
      message: "No se detectó un repo git. ¿Inicializar?",
      default: true,
    });
    if (shouldInit) {
      execSync("git init", { cwd, stdio: "pipe" });
      log.success("git init completado");
    }
  } else {
    log.success("Repositorio git detectado");
  }

  // ─── Paso 2: Template ───
  step++;
  log.step(step, totalSteps, "Seleccionando template...");

  let template = options.template;
  if (!template && !options.yes) {
    template = await select({
      message: "¿Qué template quieres usar?",
      choices: Object.values(TEMPLATES).map((t) => ({
        name: `${chalk.bold(t.name)} — ${t.description}`,
        value: t.name,
      })),
    });
  }
  template = template || "generic";

  if (!TEMPLATES[template]) {
    log.error(`Template "${template}" no existe. Disponibles: ${Object.keys(TEMPLATES).join(", ")}`);
    process.exit(1);
  }

  const tmpl = TEMPLATES[template];
  log.success(`Template: ${chalk.bold(tmpl.name)}`);

  // ─── Scaffold decision ───
  let scaffold = options.scaffold || false;
  if (!options.scaffold && !options.yes && tmpl.hasScaffold) {
    scaffold = await confirm({
      message: "¿Crear estructura de carpetas con archivos base (scaffold)?",
      default: true,
    });
  }

  // ─── Paso 3-5: Herramientas globales ───
  if (!options.skipTools) {
    step++;
    log.step(step, totalSteps, "Instalando OpenSpec...");
    await installOpenSpec();

    step++;
    log.step(step, totalSteps, "Instalando ruff...");
    await installRuff();

    step++;
    log.step(step, totalSteps, "Instalando Beads (opcional)...");
    await installBeads();
  }

  const claudeDir = join(cwd, ".claude");
  mkdirSync(join(claudeDir, "fixes"), { recursive: true });
  mkdirSync(join(claudeDir, "agent-memory", "code-auditor"), { recursive: true });

  // ─── Template files (CLAUDE.md, pyproject.toml, .env.example, .gitignore) ───
  // IMPORTANTE: se copian ANTES de initBeads() porque `bd setup claude` appendea
  // su bloque BEADS INTEGRATION al CLAUDE.md existente. Si el CLAUDE.md no existe
  // cuando bd corre, bd crea uno desde scratch con su propio template y nuestros
  // checks de !existsSync hacen que el CLAUDE.md del template quuo se omita.
  const templateDir = join(TEMPLATES_DIR, template);

  const claudeMdDest = join(cwd, "CLAUDE.md");
  if (!existsSync(claudeMdDest)) {
    const claudeMdSrc = join(templateDir, "CLAUDE.md");
    if (existsSync(claudeMdSrc)) {
      writeFileSync(claudeMdDest, readFileSync(claudeMdSrc, "utf-8"));
      log.success("CLAUDE.md creado");
    }
  } else {
    log.info("CLAUDE.md ya existe — se mantiene");
  }

  const pyprojectDest = join(cwd, "pyproject.toml");
  if (!existsSync(pyprojectDest)) {
    const pyprojectSrc = join(templateDir, "pyproject.toml");
    if (existsSync(pyprojectSrc)) {
      writeFileSync(pyprojectDest, readFileSync(pyprojectSrc, "utf-8"));
      log.success("pyproject.toml creado");
    }
  } else {
    log.info("pyproject.toml ya existe — se mantiene");
  }

  const envSrc = join(templateDir, ".env.example");
  if (existsSync(envSrc) && !existsSync(join(cwd, ".env.example"))) {
    writeFileSync(join(cwd, ".env.example"), readFileSync(envSrc, "utf-8"));
    log.success(".env.example creado");
  }

  const gitignoreSrc = join(templateDir, ".gitignore");
  if (existsSync(gitignoreSrc) && !existsSync(join(cwd, ".gitignore"))) {
    writeFileSync(join(cwd, ".gitignore"), readFileSync(gitignoreSrc, "utf-8"));
    log.success(".gitignore creado");
  }

  // ─── OpenSpec init + Beads init (DESPUÉS de los template files) ───
  // bd setup claude appendeará su bloque BEADS INTEGRATION al CLAUDE.md del template.
  if (!options.skipTools) {
    step++;
    log.step(step, totalSteps, "Inicializando OpenSpec en el proyecto...");

    if (!existsSync(join(cwd, "openspec"))) {
      await initOpenSpec(cwd);
    } else {
      log.info("OpenSpec ya inicializado en este proyecto");
    }

    step++;
    log.step(step, totalSteps, "Inicializando Beads...");

    if (!existsSync(join(cwd, ".beads"))) {
      await initBeads(cwd);
    } else {
      log.info("Beads ya inicializado en este proyecto");
    }
  }

  // ─── Paso 7: Copiar plugin red5g (DESPUÉS de OpenSpec para sobrescribir /opsx:* con nuestras versiones) ───
  step++;
  log.step(step, totalSteps, "Instalando plugin red5g...");

  const cmdCount = copyPluginFiles(join(PLUGIN_DIR, "commands"), join(claudeDir, "commands"));
  const agentCount = copyPluginFiles(join(PLUGIN_DIR, "agents"), join(claudeDir, "agents"));
  const skillCount = copyPluginFiles(join(PLUGIN_DIR, "skills"), join(claudeDir, "skills"));
  const hookCount = copyPluginFiles(join(PLUGIN_DIR, "hooks"), join(claudeDir, "hooks"));

  log.success(`Plugin instalado: ${cmdCount} commands, ${agentCount} agents, ${skillCount} skills, ${hookCount} hooks`);

  // Skills extras del template (ej: quuo3-dev solo cuando template === "quuo")
  if (tmpl.extraSkills?.length) {
    const templateSkillsDir = join(TEMPLATES_DIR, template, "skills");
    let extraCount = 0;
    for (const skillName of tmpl.extraSkills) {
      const src = join(templateSkillsDir, skillName);
      if (existsSync(src)) {
        extraCount += copyPluginFiles(src, join(claudeDir, "skills", skillName));
      }
    }
    if (extraCount > 0) {
      log.success(`Skills del template instaladas: ${tmpl.extraSkills.join(", ")} (${extraCount} archivos)`);
    }
  }

  // OpenSpec skills (openspec-*) se mantienen — proveen contexto persistente
  // Los comandos /opsx:* de red5g coexisten con las skills de OpenSpec

  // ─── settings.json ───
  const settingsPath = join(claudeDir, "settings.json");
  if (!existsSync(settingsPath)) {
    const settings = {
      permissions: {
        allow: [
          "Bash(openspec:*)",
          "Bash(red5g:*)",
          "Bash(bd:*)",
          "Bash(ruff:*)",
          "Bash(gh:*)",
          "Bash(pytest:*)",
          "Write(openspec/*)",
          "Edit(openspec/*)",
          "mcp__ide__getDiagnostics",
          "mcp__ide__executeCode",
          "mcp__clickup__*"
        ],
      },
      hooks: {
        PreToolUse: [
          {
            matcher: "Bash",
            hooks: [
              {
                type: "command",
                command: "python3 .claude/hooks/pre-commit-gate.py",
              },
            ],
          },
        ],
        PostToolUse: [
          {
            matcher: "Write|Edit|MultiEdit",
            hooks: [
              {
                type: "command",
                command: "python3 .claude/hooks/ruff-gate.py",
              },
            ],
          },
        ],
      },
    };
    writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    log.success("settings.json creado (permisos + hook ruff-gate)");
  } else {
    log.info("settings.json ya existe — se mantiene");
  }

  // ─── Scaffold ───
  if (scaffold && tmpl.hasScaffold) {
    const scaffoldDir = join(templateDir, "scaffold");
    if (existsSync(scaffoldDir)) {
      // quuo: si ya es un repo Quuo con código real, instalar solo la estructura
      // (carpetas + .gitkeep) y omitir archivos de ejemplo para no contaminar.
      if (template === "quuo" && isExistingQuuoRepo(cwd)) {
        const spinner = ora("Repo Quuo detectado — instalando solo estructura...").start();
        const { created, skipped } = copyQuuoScaffold(scaffoldDir, cwd, QUUO_EXAMPLE_FILES);
        spinner.succeed(`Estructura creada (${created} archivos nuevos, ${skipped} omitidos)`);
        log.info("Archivos de ejemplo omitidos: ExampleClass, ExampleHandler, tests, setup.py, serverless.yml, requirements/");
      } else {
        const spinner = ora("Creando estructura de carpetas...").start();
        cpSync(scaffoldDir, cwd, { recursive: true, force: false, errorOnExist: false });
        spinner.succeed("Scaffold creado");
      }
    }
  }

  // ─── ClickUp MCP ───
  step++;
  log.step(step, totalSteps, "Configurando ClickUp MCP...");

  const mcpPath = join(cwd, ".mcp.json");
  if (!existsSync(mcpPath)) {
    const mcpConfig = {
      mcpServers: {
        clickup: {
          type: "http",
          url: "https://mcp.clickup.com/mcp",
        },
      },
    };
    writeFileSync(mcpPath, JSON.stringify(mcpConfig, null, 2));
    log.success(".mcp.json creado (ClickUp MCP conectado)");
  } else {
    log.info(".mcp.json ya existe — se mantiene");
  }

  // ─── Resumen final ───
  log.header("Proyecto inicializado");
  log.blank();
  console.log(chalk.white("  Flujo de trabajo instalado:"));
  console.log(chalk.dim("  /rg:explore → /rg:plan → /rg:execute → /rg:archive  (features)"));
  console.log(chalk.dim("  /rg:feasibility <hu.md>                               (validar HU del PM)"));
  console.log(chalk.dim("  /rg:fix <descripción>                                (bugs rápidos)"));
  console.log(chalk.dim("  /rg:audit                                            (auditoría manual)"));
  log.blank();
  console.log(chalk.white("  Integración:"));
  console.log(chalk.dim("  OpenSpec → planificación spec-driven (openspec/)"));
  console.log(chalk.dim("  ClickUp MCP → Claude Code puede leer/escribir tareas"));
  log.blank();
  console.log(chalk.white("  Verifica tu entorno:"));
  console.log(chalk.cyan("  npx @red5g/cli@latest doctor"));
  log.blank();
}
