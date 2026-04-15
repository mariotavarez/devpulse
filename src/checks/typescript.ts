import path from 'path';
import semver from 'semver';
import type { CheckResult, CategoryResult } from '../types.js';
import { fileExists, readPackageJson, readTsConfig } from '../lib/reader.js';
import { calcCategoryScore } from '../lib/scorer.js';

export async function runTypeScriptChecks(projectPath: string): Promise<CategoryResult> {
  const checks: CheckResult[] = [];
  const pkg = readPackageJson(projectPath);

  const allDeps = {
    ...(pkg?.dependencies ?? {}),
    ...(pkg?.devDependencies ?? {}),
  };

  // 1. TypeScript installed?
  const tsVersion = allDeps['typescript'];
  const hasTS = Boolean(tsVersion);

  let tsVersionLabel = 'not found';
  let tsScore = 0;
  let tsStatus: CheckResult['status'] = 'fail';

  if (tsVersion) {
    const cleaned = semver.coerce(tsVersion.replace(/[\^~>=<]/g, ''));
    if (cleaned) {
      tsVersionLabel = cleaned.version;
      if (semver.gte(cleaned, '5.0.0')) {
        tsScore = 100;
        tsStatus = 'pass';
      } else if (semver.gte(cleaned, '4.0.0')) {
        tsScore = 65;
        tsStatus = 'warn';
        tsVersionLabel += ' (TypeScript 5.x recommended)';
      } else {
        tsScore = 30;
        tsStatus = 'warn';
        tsVersionLabel += ' (very old — upgrade to 5.x)';
      }
    } else {
      tsVersionLabel = tsVersion;
      tsScore = 80;
      tsStatus = 'pass';
    }
  }

  checks.push({
    name: 'ts-installed',
    status: tsStatus,
    message: hasTS ? `TypeScript ${tsVersionLabel} installed` : 'TypeScript not found in dependencies',
    score: tsScore,
    weight: 10,
  });

  // 2. tsconfig.json exists?
  const hasTsConfig = fileExists(path.join(projectPath, 'tsconfig.json'));
  checks.push({
    name: 'tsconfig',
    status: hasTsConfig ? 'pass' : (hasTS ? 'fail' : 'warn'),
    message: hasTsConfig ? 'tsconfig.json found' : 'tsconfig.json not found',
    score: hasTsConfig ? 100 : 0,
    weight: 8,
  });

  // 3. Strict mode
  let strictEnabled = false;
  const tsconfig = readTsConfig(projectPath);

  if (tsconfig) {
    const compilerOptions = tsconfig['compilerOptions'] as Record<string, unknown> | undefined;
    if (compilerOptions) {
      strictEnabled = compilerOptions['strict'] === true;
    }
  }

  checks.push({
    name: 'strict-mode',
    status: hasTsConfig ? (strictEnabled ? 'pass' : 'warn') : 'info',
    message: hasTsConfig
      ? (strictEnabled ? 'strict mode enabled in tsconfig' : 'strict mode not enabled — add "strict": true to compilerOptions')
      : 'Cannot check strict mode — no tsconfig.json',
    score: hasTsConfig ? (strictEnabled ? 100 : 50) : 50,
    weight: 7,
  });

  // 4. @types/node
  const hasTypesNode = Boolean(allDeps['@types/node']);
  // Heuristic: if the project has node-specific deps (fs, path etc used)
  // or engines.node is specified, it likely needs @types/node
  const likelyNeedsNode = Boolean(
    allDeps['express'] ||
    allDeps['fastify'] ||
    allDeps['koa'] ||
    allDeps['ts-node'] ||
    allDeps['tsx'] ||
    pkg?.engines?.['node']
  );

  if (likelyNeedsNode || hasTypesNode) {
    checks.push({
      name: 'types-node',
      status: hasTypesNode ? 'pass' : 'warn',
      message: hasTypesNode
        ? '@types/node is installed'
        : '@types/node not found — recommended for Node.js projects',
      score: hasTypesNode ? 100 : 60,
      weight: 5,
    });
  } else {
    checks.push({
      name: 'types-node',
      status: 'info',
      message: '@types/node not detected (may not be needed)',
      score: 100,
      weight: 1,
    });
  }

  const score = calcCategoryScore(checks);
  return { name: 'TypeScript', icon: '🔷', checks, score };
}
