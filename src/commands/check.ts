import ora from 'ora';
import chalk from 'chalk';
import type { CategoryResult } from '../types.js';
import { runDependencyChecks } from '../checks/dependencies.js';
import { runTypeScriptChecks } from '../checks/typescript.js';
import { runGitChecks } from '../checks/git.js';
import { runScriptChecks } from '../checks/scripts.js';
import { runStructureChecks } from '../checks/structure.js';
import { runSecurityChecks } from '../checks/security.js';
import { buildReport } from '../lib/scorer.js';
import { formatReport, formatJson } from '../lib/formatter.js';
import { findProjectRoot, readPackageJson } from '../lib/reader.js';

export interface CheckOptions {
  json?: boolean;
  path?: string;
}

export async function runCheck(options: CheckOptions = {}): Promise<void> {
  const startDir = options.path ?? process.cwd();

  // Locate project root
  const spinner = ora({
    text: chalk.dim('Locating project root…'),
    color: 'cyan',
    stream: process.stderr,
  }).start();

  const projectPath = findProjectRoot(startDir);

  if (!projectPath) {
    spinner.fail(chalk.red('No package.json found — run devpulse from inside a Node.js project.'));
    process.exit(1);
  }

  const pkg = readPackageJson(projectPath);
  const projectName = pkg?.name ?? projectPath.split('/').pop() ?? 'unknown';

  spinner.succeed(chalk.dim(`Project: ${chalk.bold(projectName)} at ${projectPath}`));

  // Run all check categories in parallel
  const runSpinner = ora({ text: 'Running health checks…', color: 'cyan', stream: process.stderr }).start();

  let categories: CategoryResult[];

  try {
    categories = await Promise.all([
      runDependencyChecks(projectPath),
      runTypeScriptChecks(projectPath),
      runGitChecks(projectPath),
      runScriptChecks(projectPath),
      runStructureChecks(projectPath),
      runSecurityChecks(projectPath),
    ]);
    runSpinner.succeed(chalk.dim('All checks complete'));
  } catch (err) {
    runSpinner.fail(chalk.red('One or more checks failed unexpectedly'));
    console.error(err);
    process.exit(1);
  }

  const report = buildReport(projectPath, projectName, categories);

  if (options.json) {
    console.log(formatJson(report));
  } else {
    console.log(formatReport(report));
  }

  // Exit with code 1 if there are any failures
  const hasFail = categories.some((c) => c.checks.some((ch) => ch.status === 'fail'));
  if (hasFail) process.exit(1);
}
