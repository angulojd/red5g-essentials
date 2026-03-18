import chalk from "chalk";

export const log = {
  info: (msg) => console.log(chalk.cyan("ℹ"), msg),
  success: (msg) => console.log(chalk.green("✔"), msg),
  warn: (msg) => console.log(chalk.yellow("⚠"), msg),
  error: (msg) => console.log(chalk.red("✖"), msg),
  step: (n, total, msg) => console.log(chalk.dim(`[${n}/${total}]`), msg),
  blank: () => console.log(),
  header: (msg) => {
    log.blank();
    console.log(chalk.bold.white(msg));
    console.log(chalk.dim("─".repeat(msg.length)));
  },
};
