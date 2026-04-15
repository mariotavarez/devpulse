export type CheckStatus = 'pass' | 'warn' | 'fail' | 'info';

export interface CheckResult {
  name: string;
  status: CheckStatus;
  message: string;
  details?: string[];
  score: number;        // 0-100 contribution
  weight: number;       // relative weight for total score
}

export interface CategoryResult {
  name: string;
  icon: string;
  checks: CheckResult[];
  score: number;
}

export interface HealthReport {
  projectName: string;
  projectPath: string;
  timestamp: string;
  totalScore: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  categories: CategoryResult[];
}

export interface PackageJson {
  name?: string;
  version?: string;
  description?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  engines?: Record<string, string>;
  license?: string;
  type?: string;
}
