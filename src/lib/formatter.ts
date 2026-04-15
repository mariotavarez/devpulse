import chalk, { type ChalkInstance } from 'chalk';
import boxen from 'boxen';
import type { HealthReport, CheckResult, CheckStatus, CategoryResult } from '../types.js';
import { countByStatus } from './scorer.js';

// ─── Status symbols ──────────────────────────────────────────────────────────

const SYMBOLS: Record<CheckStatus, string> = {
  pass: chalk.green('✅'),
  warn: chalk.yellow('⚠️ '),
  fail: chalk.red('❌'),
  info: chalk.dim(chalk.blueBright('ℹ️ ')),
};

function statusLabel(status: CheckStatus, message: string): string {
  const sym = SYMBOLS[status];
  switch (status) {
    case 'pass':
      return `  ${sym}  ${chalk.white(message)}`;
    case 'warn':
      return `  ${sym} ${chalk.yellow(message)}`;
    case 'fail':
      return `  ${sym}  ${chalk.red(message)}`;
    case 'info':
      return `  ${sym} ${chalk.dim(message)}`;
  }
}

// ─── Score bar ───────────────────────────────────────────────────────────────

function scoreColor(score: number): ChalkInstance {
  if (score >= 90) return chalk.green;
  if (score >= 75) return chalk.cyan;
  if (score >= 60) return chalk.yellow;
  if (score >= 45) return chalk.hex('#FFA500');
  return chalk.red;
}

function gradeColor(grade: string): ChalkInstance {
  switch (grade) {
    case 'A': return chalk.green;
    case 'B': return chalk.cyan;
    case 'C': return chalk.yellow;
    case 'D': return chalk.hex('#FFA500');
    default:  return chalk.red;
  }
}

// ─── Header box ──────────────────────────────────────────────────────────────

function renderHeader(report: HealthReport): string {
  const sc = scoreColor(report.totalScore);
  const gc = gradeColor(report.grade);

  const title = `💓 DevPulse — ${chalk.bold(report.projectName)}`;
  const scoreLine = `Health Score: ${sc.bold(`${report.totalScore}/100`)}  Grade: ${gc.bold(report.grade)}`;

  const inner = `${title}\n${scoreLine}`;

  return boxen(inner, {
    padding: { top: 0, bottom: 0, left: 1, right: 1 },
    borderStyle: 'double',
    borderColor: report.totalScore >= 75 ? 'green' : report.totalScore >= 60 ? 'yellow' : 'red',
    margin: { top: 1, bottom: 0, left: 0, right: 0 },
  });
}

// ─── Category block ──────────────────────────────────────────────────────────

function renderCategory(cat: CategoryResult): string {
  const sc = scoreColor(cat.score);
  const headerLeft = `${cat.icon}  ${chalk.bold(cat.name)}`;
  const headerRight = sc(`${cat.score}/100`);

  // Pad to fixed width
  const totalWidth = 52;
  const leftLen = stripAnsi(headerLeft).length;
  const rightLen = stripAnsi(headerRight).length;
  const padding = Math.max(1, totalWidth - leftLen - rightLen);

  const header = `${headerLeft}${' '.repeat(padding)}${headerRight}`;

  const lines: string[] = [header];

  for (const check of cat.checks) {
    lines.push(statusLabel(check.status, check.message));
    if (check.details && check.details.length > 0) {
      for (const detail of check.details) {
        lines.push(`        ${chalk.dim('→')} ${chalk.dim(detail)}`);
      }
    }
  }

  return lines.join('\n');
}

// ─── Footer ──────────────────────────────────────────────────────────────────

function renderFooter(report: HealthReport): string {
  const counts = countByStatus(report);
  const divider = chalk.dim('─'.repeat(52));

  const parts: string[] = [];
  if (counts.warn > 0)  parts.push(chalk.yellow(`${counts.warn} warning${counts.warn !== 1 ? 's' : ''}`));
  if (counts.info > 0)  parts.push(chalk.dim(`${counts.info} info`));
  if (counts.fail > 0)  parts.push(chalk.red(`${counts.fail} failure${counts.fail !== 1 ? 's' : ''}`));
  if (parts.length === 0) parts.push(chalk.green('All checks passed'));

  const summary = `  📋 ${parts.join(chalk.dim(' · '))}`;
  const hint    = chalk.dim('  Run devpulse --json for machine-readable output');

  return `\n${divider}\n${summary}\n${hint}\n`;
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function formatReport(report: HealthReport): string {
  const sections: string[] = [renderHeader(report)];

  for (const cat of report.categories) {
    sections.push('\n' + renderCategory(cat));
  }

  sections.push(renderFooter(report));

  return sections.join('\n');
}

export function formatJson(report: HealthReport): string {
  return JSON.stringify(report, null, 2);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Strip ANSI escape codes for length calculations. */
function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, '');
}
