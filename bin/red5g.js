#!/usr/bin/env node

import { Command } from "commander";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { initCommand } from "../src/commands/init.js";
import { updateCommand } from "../src/commands/update.js";
import { doctorCommand } from "../src/commands/doctor.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, "..", "package.json"), "utf-8"));

const program = new Command();

program
  .name("red5g")
  .description(
    "Instala y configura el flujo de trabajo red5g para Claude Code.\n" +
    "Integra OpenSpec (planificación) + auditor de calidad + ruff + quality gates."
  )
  .version(pkg.version);

program
  .command("init")
  .description("Inicializa un proyecto: instala herramientas, copia plugin, crea scaffold")
  .option("-t, --template <nombre>", "Template a usar (backend-mysql | quuo | generic)")
  .option("-s, --scaffold", "Crear estructura de carpetas con archivos base")
  .option("-y, --yes", "Aceptar valores por defecto sin preguntar")
  .option("--skip-tools", "No instalar herramientas globales (OpenSpec, ruff, Beads)")
  .action(initCommand);

program
  .command("update")
  .description("Actualiza comandos, agents, skills y hooks a la última versión")
  .option("--force", "Sobrescribir todo sin preguntar")
  .action(updateCommand);

program
  .command("doctor")
  .description("Verifica que el entorno esté listo para trabajar")
  .action(doctorCommand);

program.parse();
