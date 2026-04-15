import ora from 'ora';
import chalk from 'chalk';
import { runDependencyChecks } from '../checks/dependencies.js';
import { buildReport } from '../lib/scorer.js';
import { formatReport, formatJson } from '../lib/formatter.js';
import { findProjectRoot, readPackageJson } from '../lib/reader.js';
import type { CheckOptions } from './check.js';

export async function runDepsCommand(options: CheckOptions = {}): Promise<void> {
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

  const runSpinner = ora({ text: 'Analyzing dependencies…', color: 'cyan', stream: process.stderr }).start();
  const category = await runDependencyChecks(projectPath);
  runSpinner.succeed(chalk.dim('Dependency analysis complete'));

  const report = buildReport(projectPath, projectName, [category]);

  if (options.json) {
    console.log(formatJson(report));
  } else {
    console.log(formatReport(report));
  }

  const hasFail = category.checks.some((c) => c.status === 'fail');
  if (hasFail) process.exit(1);
}
