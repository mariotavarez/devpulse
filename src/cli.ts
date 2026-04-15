#!/usr/bin/env node
import { Command } from 'commander';
import { runCheck } from './commands/check.js';
import { runDepsCommand } from './commands/deps.js';
import { runSecurityCommand } from './commands/security.js';

const program = new Command();

program
  .name('devpulse')
  .description('Project health monitor — score your codebase in seconds')
  .version('1.0.0')
  .enablePositionalOptions()
  // Root-level options for the default "full check" action
  .option('--json', 'Output results as JSON')
  .option('--path <dir>', 'Path to project to analyse (defaults to cwd)')
  .action(async function (this: Command) {
    const opts = this.opts<{ json?: boolean; path?: string }>();
    await runCheck(opts);
  });

// ─── deps subcommand ─────────────────────────────────────────────────────────
const depsCmd = new Command('deps')
  .description('Dependency analysis only')
  .passThroughOptions()
  .option('--json', 'Output results as JSON')
  .option('--path <dir>', 'Path to project to analyse (defaults to cwd)')
  .action(async function (this: Command) {
    const opts = this.opts<{ json?: boolean; path?: string }>();
    await runDepsCommand(opts);
  });

// ─── security subcommand ─────────────────────────────────────────────────────
const securityCmd = new Command('security')
  .description('Security checks only')
  .passThroughOptions()
  .option('--json', 'Output results as JSON')
  .option('--path <dir>', 'Path to project to analyse (defaults to cwd)')
  .action(async function (this: Command) {
    const opts = this.opts<{ json?: boolean; path?: string }>();
    await runSecurityCommand(opts);
  });

program.addCommand(depsCmd);
program.addCommand(securityCmd);

program.parseAsync(process.argv).catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
