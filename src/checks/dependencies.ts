import path from 'path';
import semver from 'semver';
import type { CheckResult, CategoryResult } from '../types.js';
import { fileExists, readPackageJson } from '../lib/reader.js';
import { calcCategoryScore } from '../lib/scorer.js';

// Packages commonly flagged for security issues or abandonment
const FLAGGED_PACKAGES = [
  'node-uuid',        // replaced by uuid
  'request',          // deprecated
  'har-validator',    // deprecated
  'event-stream',     // malicious incident
  'flatmap-stream',   // malicious
  'left-pad',         // infamous removal event
  'is-buffer',        // used as lodash attack vector in past
  'eslint-scope',     // hijacked in 2018
];

export async function runDependencyChecks(projectPath: string): Promise<CategoryResult> {
  const checks: CheckResult[] = [];

  // 1. Has package.json
  const pkg = readPackageJson(projectPath);
  checks.push({
    name: 'package.json',
    status: pkg ? 'pass' : 'fail',
    message: pkg ? 'package.json found' : 'package.json not found',
    score: pkg ? 100 : 0,
    weight: 10,
  });

  if (!pkg) {
    // Nothing else to check
    const score = calcCategoryScore(checks);
    return { name: 'Dependencies', icon: '📦', checks, score };
  }

  // 2. Lock file
  const hasNpmLock   = fileExists(path.join(projectPath, 'package-lock.json'));
  const hasYarnLock  = fileExists(path.join(projectPath, 'yarn.lock'));
  const hasPnpmLock  = fileExists(path.join(projectPath, 'pnpm-lock.yaml'));
  const hasLock = hasNpmLock || hasYarnLock || hasPnpmLock;
  const lockName = hasNpmLock ? 'package-lock.json' : hasYarnLock ? 'yarn.lock' : hasPnpmLock ? 'pnpm-lock.yaml' : '';

  checks.push({
    name: 'lock-file',
    status: hasLock ? 'pass' : 'warn',
    message: hasLock ? `${lockName} found` : 'No lock file found (package-lock.json / yarn.lock / pnpm-lock.yaml)',
    score: hasLock ? 100 : 40,
    weight: 8,
  });

  // 3. Production dep count
  const prodDeps = Object.keys(pkg.dependencies ?? {});
  const devDeps  = Object.keys(pkg.devDependencies ?? {});
  const prodCount = prodDeps.length;

  checks.push({
    name: 'prod-dep-count',
    status: prodCount > 50 ? 'warn' : 'pass',
    message: prodCount > 50
      ? `${prodCount} production dependencies (consider pruning)`
      : `${prodCount} production dependenc${prodCount === 1 ? 'y' : 'ies'}`,
    score: prodCount > 100 ? 50 : prodCount > 50 ? 75 : 100,
    weight: 4,
  });

  // 4. devDependencies info
  checks.push({
    name: 'dev-dep-count',
    status: 'info',
    message: `${devDeps.length} devDependenc${devDeps.length === 1 ? 'y' : 'ies'}`,
    score: 100,
    weight: 1,
  });

  // 5. Duplicate deps (in both prod and dev)
  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
  const duplicates = prodDeps.filter((d) => devDeps.includes(d));

  checks.push({
    name: 'duplicate-deps',
    status: duplicates.length > 0 ? 'warn' : 'pass',
    message: duplicates.length > 0
      ? `${duplicates.length} package(s) in both dependencies and devDependencies`
      : 'No duplicate deps',
    details: duplicates.length > 0 ? duplicates : undefined,
    score: duplicates.length > 0 ? 60 : 100,
    weight: 5,
  });

  // 6. Outdated major versions check
  const outdatedIssues: string[] = [];

  const reactVer = allDeps['react'];
  if (reactVer) {
    const cleaned = semver.coerce(reactVer.replace(/[\^~>=<]/g, ''));
    if (cleaned && semver.lt(cleaned, '17.0.0')) {
      outdatedIssues.push(`react ${reactVer} is very old (17+ recommended)`);
    }
  }

  const nodeEngineVer = pkg.engines?.['node'];
  if (nodeEngineVer) {
    const cleaned = semver.coerce(nodeEngineVer.replace(/[\^~>=<]/g, ''));
    if (cleaned && semver.lt(cleaned, '18.0.0')) {
      outdatedIssues.push(`engines.node ${nodeEngineVer} — Node 18+ recommended`);
    }
  }

  const angularVer = allDeps['@angular/core'];
  if (angularVer) {
    const cleaned = semver.coerce(angularVer.replace(/[\^~>=<]/g, ''));
    if (cleaned && semver.lt(cleaned, '15.0.0')) {
      outdatedIssues.push(`@angular/core ${angularVer} is very old (v15+ recommended)`);
    }
  }

  checks.push({
    name: 'outdated-majors',
    status: outdatedIssues.length > 0 ? 'warn' : 'pass',
    message: outdatedIssues.length > 0
      ? `${outdatedIssues.length} potentially outdated major version(s)`
      : 'No obviously outdated major versions',
    details: outdatedIssues.length > 0 ? outdatedIssues : undefined,
    score: outdatedIssues.length > 0 ? 60 : 100,
    weight: 6,
  });

  // 7. Flagged packages
  const flagged = FLAGGED_PACKAGES.filter((p) => prodDeps.includes(p) || devDeps.includes(p));

  checks.push({
    name: 'flagged-packages',
    status: flagged.length > 0 ? 'warn' : 'pass',
    message: flagged.length > 0
      ? `${flagged.length} known problematic package(s) found`
      : 'No known problematic packages',
    details: flagged.length > 0 ? flagged.map((f) => `${f} — consider alternatives`) : undefined,
    score: flagged.length > 0 ? 50 : 100,
    weight: 7,
  });

  const score = calcCategoryScore(checks);
  return { name: 'Dependencies', icon: '📦', checks, score };
}
