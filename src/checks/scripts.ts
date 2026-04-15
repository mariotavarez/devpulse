import type { CheckResult, CategoryResult } from '../types.js';
import { readPackageJson } from '../lib/reader.js';
import { calcCategoryScore } from '../lib/scorer.js';

export async function runScriptChecks(projectPath: string): Promise<CategoryResult> {
  const checks: CheckResult[] = [];
  const pkg = readPackageJson(projectPath);
  const scripts = pkg?.scripts ?? {};
  const scriptNames = Object.keys(scripts);

  function hasScript(...names: string[]): boolean {
    return names.some((n) => scriptNames.includes(n));
  }

  // 1. Build script
  checks.push({
    name: 'build-script',
    status: hasScript('build') ? 'pass' : 'warn',
    message: hasScript('build') ? '"build" script found' : 'No "build" script — add one to package.json scripts',
    score: hasScript('build') ? 100 : 50,
    weight: 8,
  });

  // 2. Test script
  const hasTest = hasScript('test', 'test:unit', 'test:run', 'spec');
  checks.push({
    name: 'test-script',
    status: hasTest ? 'pass' : 'warn',
    message: hasTest ? 'Test script found' : 'No test script found (test, test:unit…) — add one',
    score: hasTest ? 100 : 30,
    weight: 10,
  });

  // 3. Lint script
  const hasLint = hasScript('lint', 'lint:fix', 'eslint');
  checks.push({
    name: 'lint-script',
    status: hasLint ? 'pass' : 'warn',
    message: hasLint ? 'Lint script found' : 'No lint script — consider adding ESLint',
    score: hasLint ? 100 : 55,
    weight: 6,
  });

  // 4. Dev / start script
  const hasDev = hasScript('dev', 'start', 'serve', 'preview');
  checks.push({
    name: 'dev-script',
    status: hasDev ? 'pass' : 'info',
    message: hasDev ? '"dev" / "start" script found' : 'No dev or start script — consider adding one',
    score: hasDev ? 100 : 70,
    weight: 5,
  });

  // 5. Typecheck script or type checking integrated in build
  const hasTypecheck =
    hasScript('typecheck', 'type-check', 'tsc', 'types') ||
    // check if build script contains tsc
    Object.entries(scripts).some(([name, val]) =>
      (name === 'build' || name === 'typecheck') && val.includes('tsc')
    );

  checks.push({
    name: 'typecheck-script',
    status: hasTypecheck ? 'pass' : 'warn',
    message: hasTypecheck
      ? 'Type checking found (tsc or typecheck script)'
      : 'No typecheck script — add "typecheck": "tsc --noEmit"',
    score: hasTypecheck ? 100 : 45,
    weight: 7,
  });

  // 6. Dangerous scripts check
  const dangerousPatterns = [/rm\s+-rf\s+\//, /format\s+c:/i, /:\(\)\{\s*:\|:&\s*\};:/];
  const dangerousScripts = Object.entries(scripts)
    .filter(([, val]) => dangerousPatterns.some((p) => p.test(val)))
    .map(([name]) => name);

  checks.push({
    name: 'dangerous-scripts',
    status: dangerousScripts.length > 0 ? 'fail' : 'pass',
    message: dangerousScripts.length > 0
      ? `Potentially dangerous script(s): ${dangerousScripts.join(', ')}`
      : 'No dangerous commands in scripts',
    details: dangerousScripts.length > 0
      ? dangerousScripts.map((s) => `Review the "${s}" script carefully`)
      : undefined,
    score: dangerousScripts.length > 0 ? 0 : 100,
    weight: 10,
  });

  const score = calcCategoryScore(checks);
  return { name: 'Scripts', icon: '⚙️ ', checks, score };
}
