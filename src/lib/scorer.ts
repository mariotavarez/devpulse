import type { CategoryResult, CheckResult, HealthReport } from '../types.js';
import dayjs from 'dayjs';

/**
 * Calculate the weighted score for a set of checks.
 * Each check contributes `score * weight` to the total,
 * divided by the sum of all weights.
 */
export function calcCategoryScore(checks: CheckResult[]): number {
  if (checks.length === 0) return 100;

  const totalWeight = checks.reduce((sum, c) => sum + c.weight, 0);
  if (totalWeight === 0) return 100;

  const weightedSum = checks.reduce((sum, c) => sum + c.score * c.weight, 0);
  return Math.round(weightedSum / totalWeight);
}

/**
 * Determine the letter grade from a numeric score.
 * A=90+, B=75+, C=60+, D=45+, F=<45
 */
export function scoreToGrade(score: number): HealthReport['grade'] {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 45) return 'D';
  return 'F';
}

/**
 * Build a HealthReport from a project path and its computed categories.
 */
export function buildReport(
  projectPath: string,
  projectName: string,
  categories: CategoryResult[]
): HealthReport {
  // Weighted average across all checks in all categories
  const allChecks = categories.flatMap((c) => c.checks);
  const totalScore = calcCategoryScore(allChecks);

  return {
    projectName,
    projectPath,
    timestamp: dayjs().toISOString(),
    totalScore,
    grade: scoreToGrade(totalScore),
    categories,
  };
}

/**
 * Count checks by status across the entire report.
 */
export function countByStatus(report: HealthReport): {
  pass: number;
  warn: number;
  fail: number;
  info: number;
} {
  const counts = { pass: 0, warn: 0, fail: 0, info: 0 };
  for (const cat of report.categories) {
    for (const check of cat.checks) {
      counts[check.status]++;
    }
  }
  return counts;
}
