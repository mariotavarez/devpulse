import fs from 'fs';
import path from 'path';
import type { PackageJson } from '../types.js';

/**
 * Safely read a file, returning null if not found or unreadable.
 */
export function readFileSafe(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}

/**
 * Check if a file exists at the given path.
 */
export function fileExists(filePath: string): boolean {
  try {
    fs.accessSync(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a directory exists at the given path.
 */
export function dirExists(dirPath: string): boolean {
  try {
    const stat = fs.statSync(dirPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Read and parse package.json from a directory.
 * Returns null if not found or parse fails.
 */
export function readPackageJson(projectPath: string): PackageJson | null {
  const pkgPath = path.join(projectPath, 'package.json');
  const content = readFileSafe(pkgPath);
  if (!content) return null;
  try {
    return JSON.parse(content) as PackageJson;
  } catch {
    return null;
  }
}

/**
 * Read and parse tsconfig.json from a directory.
 * Returns null if not found or parse fails.
 */
export function readTsConfig(projectPath: string): Record<string, unknown> | null {
  const tsconfigPath = path.join(projectPath, 'tsconfig.json');
  const content = readFileSafe(tsconfigPath);
  if (!content) return null;
  try {
    // Strip single-line and trailing comments for lenient parsing
    const stripped = content.replace(/\/\/[^\n]*/g, '').replace(/,\s*([}\]])/g, '$1');
    return JSON.parse(stripped) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Find the project root by walking up from startDir until package.json is found.
 */
export function findProjectRoot(startDir: string): string | null {
  let current = path.resolve(startDir);
  const root = path.parse(current).root;

  while (current !== root) {
    if (fileExists(path.join(current, 'package.json'))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }

  return null;
}

/**
 * Read .gitignore lines from a project directory.
 */
export function readGitignore(projectPath: string): string[] {
  const content = readFileSafe(path.join(projectPath, '.gitignore'));
  if (!content) return [];
  return content
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('#'));
}

/**
 * List files in a directory (non-recursive, first level only).
 */
export function listDir(dirPath: string): string[] {
  try {
    return fs.readdirSync(dirPath);
  } catch {
    return [];
  }
}
