import ora from 'ora';
import chalk from 'chalk';
import { runSecurityChecks } from '../checks/security.js';
import { buildReport } from '../lib/scorer.js';
import { formatReport, formatJson } from '../lib/formatter.js';
import { findProjectRoot, readPackageJson } from '../lib/reader.js';
import type { CheckOptions } from './check.js';

export async function runSecurityCommand(options: CheckOptions = {}): Promise<void> {
  const startDir = options.path ?? process.cwd();

  const spinner = ora({ text: chalk.dim('Locating project root…'), color: 'cyan', stream: process.stderr }).start();
  const projectPath = findProjectRoot(startDir);

  if (!projectPath) {
    spinner.fail(chalk.red('No package.json found.'));
    process.exit(1);
  }

  const pkg = readPackageJson(projectPath);
  const projectName = pkg?.name ?? projectPath.split('/').pop() ?? 'unknown';
  spinner.succeed(chalk.dim(`Project: ${chalk.bold(projectName)}`));

  const runSpinner = ora({ text: 'Running security checks…', color: 'cyan', stream: process.stderr }).start();
  const category = await runSecurityChecks(projectPath);
  runSpinner.succeed(chalk.dim('Security check complete'));

  const report = buildReport(projectPath, projectName, [category]);

  if (options.json) {
    console.log(formatJson(report));
  } else {
    console.log(formatReport(report));
  }

  const hasFail = category.checks.some((c) => c.status === 'fail');
  if (hasFail) process.exit(1);
}
