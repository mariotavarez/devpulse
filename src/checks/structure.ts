import path from 'path';
import type { CheckResult, CategoryResult } from '../types.js';
import { dirExists, fileExists, readGitignore, listDir } from '../lib/reader.js';
import { calcCategoryScore } from '../lib/scorer.js';

export async function runStructureChecks(projectPath: string): Promise<CategoryResult> {
  const checks: CheckResult[] = [];

  // 1. Has src/ directory?
  const hasSrc = dirExists(path.join(projectPath, 'src'));
  checks.push({
    name: 'src-dir',
    status: hasSrc ? 'pass' : 'warn',
    message: hasSrc ? 'src/ directory exists' : 'No src/ directory — consider organising source files under src/',
    score: hasSrc ? 100 : 60,
    weight: 6,
  });

  // 2. Has tests/ or __tests__/?
  const hasTests =
    dirExists(path.join(projectPath, 'tests')) ||
    dirExists(path.join(projectPath, '__tests__')) ||
    dirExists(path.join(projectPath, 'test')) ||
    dirExists(path.join(projectPath, 'spec'));

  checks.push({
    name: 'tests-dir',
    status: hasTests ? 'pass' : 'warn',
    message: hasTests ? 'Test directory found' : 'No test directory (tests/, __tests__/, test/, spec/) — add tests!',
    score: hasTests ? 100 : 30,
    weight: 9,
  });

  // 3. .env.example exists (info)
  const hasEnvExample =
    fileExists(path.join(projectPath, '.env.example')) ||
    fileExists(path.join(projectPath, '.env.sample'));

  checks.push({
    name: 'env-example',
    status: hasEnvExample ? 'pass' : 'info',
    message: hasEnvExample
      ? '.env.example found — good practice!'
      : 'No .env.example — consider adding one to document env vars',
    score: hasEnvExample ? 100 : 80,
    weight: 3,
  });

  // 4. No obvious secrets in project root files
  const gitignoreLines = readGitignore(projectPath);
  const envCovered = gitignoreLines.some((l) =>
    /^\.env$|^\.env\.\*$|^\.env\.local$|^\*\.env$/.test(l)
  );

  const dotEnvExists = fileExists(path.join(projectPath, '.env'));

  if (dotEnvExists && !envCovered) {
    checks.push({
      name: 'env-in-gitignore',
      status: 'fail',
      message: '.env file exists but is NOT covered by .gitignore — risk of secret leakage!',
      details: ['Add ".env" to your .gitignore immediately'],
      score: 0,
      weight: 10,
    });
  } else if (dotEnvExists && envCovered) {
    checks.push({
      name: 'env-in-gitignore',
      status: 'pass',
      message: '.env exists and is covered by .gitignore',
      score: 100,
      weight: 10,
    });
  } else {
    checks.push({
      name: 'env-in-gitignore',
      status: 'pass',
      message: 'No unprotected .env file detected',
      score: 100,
      weight: 5,
    });
  }

  // 5. node_modules not committed (check it exists in .gitignore if node_modules dir exists)
  const hasNodeModules = dirExists(path.join(projectPath, 'node_modules'));
  const nmIgnored = gitignoreLines.some((l) => /^node_modules\/?$/.test(l));

  if (hasNodeModules) {
    checks.push({
      name: 'node-modules-ignored',
      status: nmIgnored ? 'pass' : 'fail',
      message: nmIgnored
        ? 'node_modules is in .gitignore'
        : 'node_modules exists but is NOT in .gitignore — do not commit node_modules!',
      score: nmIgnored ? 100 : 0,
      weight: 8,
    });
  }

  // 6. Project root is not cluttered (informational)
  const rootFiles = listDir(projectPath);
  const configFiles = rootFiles.filter((f) =>
    /\.(json|yaml|yml|toml|ini|config\.[jt]s)$/.test(f)
  );

  if (configFiles.length > 12) {
    checks.push({
      name: 'root-clutter',
      status: 'info',
      message: `${configFiles.length} config files in project root — consider a /config directory`,
      score: 80,
      weight: 2,
    });
  } else {
    checks.push({
      name: 'root-clutter',
      status: 'pass',
      message: 'Project root is reasonably tidy',
      score: 100,
      weight: 2,
    });
  }

  const score = calcCategoryScore(checks);
  return { name: 'Structure', icon: '📁', checks, score };
}
