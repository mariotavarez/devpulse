import path from 'path';
import { execSync } from 'child_process';
import type { CheckResult, CategoryResult } from '../types.js';
import { dirExists, fileExists, readGitignore } from '../lib/reader.js';
import { calcCategoryScore } from '../lib/scorer.js';

function isGitRepo(projectPath: string): boolean {
  return dirExists(path.join(projectPath, '.git'));
}

function getUncommittedCount(projectPath: string): number {
  try {
    const output = execSync('git status --porcelain', {
      cwd: projectPath,
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 5000,
    }).toString();
    return output.trim().split('\n').filter(Boolean).length;
  } catch {
    return -1; // not a git repo or git not available
  }
}

export async function runGitChecks(projectPath: string): Promise<CategoryResult> {
  const checks: CheckResult[] = [];

  // 1. Is a git repo?
  const isRepo = isGitRepo(projectPath);
  checks.push({
    name: 'git-repo',
    status: isRepo ? 'pass' : 'fail',
    message: isRepo ? 'Git repository detected (.git/ found)' : 'Not a git repository — run git init',
    score: isRepo ? 100 : 0,
    weight: 10,
  });

  // 2. .gitignore exists?
  const hasGitignore = fileExists(path.join(projectPath, '.gitignore'));
  checks.push({
    name: 'gitignore',
    status: hasGitignore ? 'pass' : 'fail',
    message: hasGitignore ? '.gitignore found' : '.gitignore missing',
    score: hasGitignore ? 100 : 0,
    weight: 8,
  });

  // 3. .gitignore covers essential entries
  const gitignoreLines = readGitignore(projectPath);

  const essentials: Array<{ pattern: RegExp; label: string }> = [
    { pattern: /^node_modules\/?$/, label: 'node_modules' },
    { pattern: /^dist\/?$|^build\/?$|^out\/?$/, label: 'dist/build' },
    { pattern: /^\.env$|^\.env\.\*$|^\.env\.local$/, label: '.env' },
  ];

  const missing: string[] = [];
  for (const { pattern, label } of essentials) {
    const covered = gitignoreLines.some((l) => pattern.test(l));
    if (!covered) missing.push(label);
  }

  if (hasGitignore) {
    checks.push({
      name: 'gitignore-contents',
      status: missing.length === 0 ? 'pass' : 'warn',
      message: missing.length === 0
        ? '.gitignore covers node_modules, dist, .env'
        : `.gitignore may be missing: ${missing.join(', ')}`,
      details: missing.length > 0 ? missing.map((m) => `Add "${m}" to .gitignore`) : undefined,
      score: missing.length === 0 ? 100 : Math.max(40, 100 - missing.length * 20),
      weight: 7,
    });
  }

  // 4. Uncommitted changes
  if (isRepo) {
    const uncommitted = getUncommittedCount(projectPath);
    if (uncommitted === -1) {
      checks.push({
        name: 'uncommitted-changes',
        status: 'info',
        message: 'Could not determine uncommitted changes',
        score: 100,
        weight: 1,
      });
    } else if (uncommitted === 0) {
      checks.push({
        name: 'uncommitted-changes',
        status: 'pass',
        message: 'Working tree is clean (no uncommitted changes)',
        score: 100,
        weight: 5,
      });
    } else {
      checks.push({
        name: 'uncommitted-changes',
        status: 'warn',
        message: `${uncommitted} uncommitted change${uncommitted !== 1 ? 's' : ''} in working tree`,
        score: uncommitted > 20 ? 40 : 70,
        weight: 5,
      });
    }
  }

  // 5. README.md
  const hasReadme =
    fileExists(path.join(projectPath, 'README.md')) ||
    fileExists(path.join(projectPath, 'readme.md')) ||
    fileExists(path.join(projectPath, 'README.MD'));

  checks.push({
    name: 'readme',
    status: hasReadme ? 'pass' : 'warn',
    message: hasReadme ? 'README.md found' : 'No README.md — consider adding one',
    score: hasReadme ? 100 : 50,
    weight: 4,
  });

  const score = calcCategoryScore(checks);
  return { name: 'Git', icon: '🌿', checks, score };
}
