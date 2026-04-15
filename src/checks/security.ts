import path from 'path';
import fs from 'fs';
import type { CheckResult, CategoryResult } from '../types.js';
import { fileExists, readFileSafe, readGitignore, dirExists } from '../lib/reader.js';
import { calcCategoryScore } from '../lib/scorer.js';

// Files commonly scanned for secrets
const CONFIG_FILE_CANDIDATES = [
  'config.js',
  'config.ts',
  'config.json',
  '.env.development',
  '.env.production',
  '.env.staging',
  'app.config.js',
  'app.config.ts',
  'next.config.js',
  'next.config.ts',
  'vite.config.js',
  'vite.config.ts',
  'webpack.config.js',
];

// Patterns that suggest hardcoded secrets
const SECRET_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /sk-[A-Za-z0-9]{20,}/, label: 'OpenAI API key pattern (sk-...)' },
  { pattern: /Bearer\s+[A-Za-z0-9\-._~+/]+=*/, label: 'Bearer token hardcoded' },
  { pattern: /ghp_[A-Za-z0-9]{36}/, label: 'GitHub personal access token' },
  { pattern: /AKIA[0-9A-Z]{16}/, label: 'AWS access key ID' },
  { pattern: /AIza[0-9A-Za-z\-_]{35}/, label: 'Google API key' },
  { pattern: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/, label: 'Private key in source' },
];

export async function runSecurityChecks(projectPath: string): Promise<CategoryResult> {
  const checks: CheckResult[] = [];
  const gitignoreLines = readGitignore(projectPath);

  // 1. .env in .gitignore
  const envCovered = gitignoreLines.some((l) =>
    /^\.env$|^\.env\.\*$|^\*\.env$|^\.env\.local$/.test(l)
  );

  checks.push({
    name: 'env-gitignore',
    status: envCovered ? 'pass' : 'warn',
    message: envCovered
      ? '.env is covered by .gitignore'
      : '.env is not covered in .gitignore — add ".env" immediately',
    score: envCovered ? 100 : 0,
    weight: 10,
  });

  // 2. Scan config files for hardcoded secret patterns
  const secretFindings: string[] = [];

  for (const candidate of CONFIG_FILE_CANDIDATES) {
    const filePath = path.join(projectPath, candidate);
    if (!fileExists(filePath)) continue;

    const content = readFileSafe(filePath);
    if (!content) continue;

    for (const { pattern, label } of SECRET_PATTERNS) {
      if (pattern.test(content)) {
        secretFindings.push(`${candidate}: possible ${label}`);
      }
    }
  }

  checks.push({
    name: 'hardcoded-secrets',
    status: secretFindings.length > 0 ? 'fail' : 'pass',
    message: secretFindings.length > 0
      ? `${secretFindings.length} potential secret(s) found in config files`
      : 'No hardcoded API key patterns detected in config files',
    details: secretFindings.length > 0 ? secretFindings : undefined,
    score: secretFindings.length > 0 ? 0 : 100,
    weight: 15,
  });

  // 3. node_modules not committed
  const nmDir = path.join(projectPath, 'node_modules');
  const nmIgnored = gitignoreLines.some((l) => /^node_modules\/?$/.test(l));
  const nmExists = dirExists(nmDir);

  if (nmExists && !nmIgnored) {
    checks.push({
      name: 'node-modules-committed',
      status: 'fail',
      message: 'node_modules is not in .gitignore — it may be committed to the repo',
      details: ['Add "node_modules" to .gitignore'],
      score: 0,
      weight: 10,
    });
  } else {
    checks.push({
      name: 'node-modules-committed',
      status: 'pass',
      message: 'node_modules is not at risk of being committed',
      score: 100,
      weight: 10,
    });
  }

  // 4. Dangerous scripts in package.json
  let pkgContent: Record<string, unknown> | null = null;
  const pkgPath = path.join(projectPath, 'package.json');
  try {
    pkgContent = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) as Record<string, unknown>;
  } catch {
    // ignore
  }

  if (pkgContent) {
    const scripts = (pkgContent['scripts'] as Record<string, string>) ?? {};
    const dangerousFound: string[] = [];

    const dangerousPatterns: Array<{ pattern: RegExp; label: string }> = [
      { pattern: /rm\s+-rf\s+\/[^a-z]/, label: 'rm -rf /' },
      { pattern: /rm\s+-rf\s+~/, label: 'rm -rf ~/' },
      { pattern: /format\s+c:/i, label: 'format C:' },
      { pattern: /:\(\)\{\s*:\|:&\s*\};:/, label: 'fork bomb' },
      { pattern: /curl\s+.+\s*\|\s*(bash|sh)\s*$/, label: 'curl pipe to shell' },
      { pattern: /wget\s+.+\s*-O\s*-\s*\|\s*(bash|sh)/, label: 'wget pipe to shell' },
    ];

    for (const [name, value] of Object.entries(scripts)) {
      for (const { pattern, label } of dangerousPatterns) {
        if (pattern.test(value)) {
          dangerousFound.push(`"${name}" script contains: ${label}`);
        }
      }
    }

    checks.push({
      name: 'dangerous-scripts',
      status: dangerousFound.length > 0 ? 'fail' : 'pass',
      message: dangerousFound.length > 0
        ? `${dangerousFound.length} dangerous command(s) in npm scripts`
        : 'No dangerous commands in npm scripts',
      details: dangerousFound.length > 0 ? dangerousFound : undefined,
      score: dangerousFound.length > 0 ? 0 : 100,
      weight: 10,
    });
  }

  // 5. .env files not exposed publicly (check for .env.production etc)
  const sensitiveEnvFiles = ['.env.production', '.env.prod', '.env.staging'].filter((f) =>
    fileExists(path.join(projectPath, f))
  );

  const allCovered = sensitiveEnvFiles.every((f) => {
    const base = path.basename(f);
    return gitignoreLines.some((l) => l === base || l === '.env.*' || l === '*.env');
  });

  if (sensitiveEnvFiles.length > 0) {
    checks.push({
      name: 'sensitive-env-files',
      status: allCovered ? 'pass' : 'warn',
      message: allCovered
        ? `${sensitiveEnvFiles.length} env file(s) covered by .gitignore`
        : `Sensitive env file(s) may not be in .gitignore: ${sensitiveEnvFiles.join(', ')}`,
      score: allCovered ? 100 : 30,
      weight: 8,
    });
  } else {
    checks.push({
      name: 'sensitive-env-files',
      status: 'info',
      message: 'No .env.production / .env.staging files found',
      score: 100,
      weight: 1,
    });
  }

  const score = calcCategoryScore(checks);
  return { name: 'Security', icon: '🔒', checks, score };
}
