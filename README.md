# devpulse

> Project health monitor — score your codebase in seconds

![Node.js 20+](https://img.shields.io/badge/node-%3E%3D20-brightgreen)
![TypeScript 5.7](https://img.shields.io/badge/typescript-5.7-blue)
![License: MIT](https://img.shields.io/badge/license-MIT-yellow)

```
╔══════════════════════════════════════════════════╗
║  💓 DevPulse — my-awesome-app                    ║
║  Health Score: 87/100  Grade: B                  ║
╚══════════════════════════════════════════════════╝

📦  Dependencies                              92/100
  ✅  package.json found
  ✅  package-lock.json found
  ✅  12 production dependencies
  ✅  No duplicate deps
  ✅  No obviously outdated major versions
  ✅  No known problematic packages

🔷  TypeScript                                95/100
  ✅  TypeScript 5.7.3 installed
  ✅  tsconfig.json found
  ✅  strict mode enabled
  ✅  @types/node is installed

🌿  Git                                       88/100
  ✅  Git repository detected
  ✅  .gitignore found
  ✅  .gitignore covers node_modules, dist, .env
  ⚠️   3 uncommitted changes in working tree
  ✅  README.md found

⚙️   Scripts                                  90/100
  ✅  "build" script found
  ✅  Test script found
  ✅  Lint script found
  ✅  "dev" / "start" script found
  ✅  Type checking found (tsc or typecheck script)
  ✅  No dangerous commands in scripts

📁  Structure                                 80/100
  ✅  src/ directory exists
  ⚠️   No test directory — add tests!
  ℹ️   No .env.example — consider adding one
  ✅  No unprotected .env file detected
  ✅  Project root is reasonably tidy

🔒  Security                                  85/100
  ✅  .env is covered by .gitignore
  ✅  No hardcoded API key patterns detected
  ✅  node_modules is not at risk of being committed
  ✅  No dangerous commands in npm scripts

────────────────────────────────────────────────────
  📋 2 warnings · 1 info · 0 failures
  Run devpulse --json for machine-readable output
```

## Features

- **Health scoring** — weighted score (0–100) with letter grade (A–F)
- **Dependency analysis** — lock file, dep count, flagged packages, duplicate detection
- **TypeScript checks** — tsconfig, strict mode, version recency
- **Git health** — gitignore coverage, uncommitted changes, README presence
- **Script validation** — build, test, lint, typecheck presence
- **Structure analysis** — src/ layout, test directories, .env safety
- **Security audit** — hardcoded secret pattern scanning, dangerous scripts

## Installation

```bash
# Global install
npm install -g devpulse

# Or run without installing
npx devpulse
```

## Usage

```bash
devpulse              # full health check (default)
devpulse deps         # dependency analysis only
devpulse security     # security checks only
devpulse --json       # machine-readable JSON output
devpulse --path ./my-project   # check a different directory
```

## What it checks

| Category       | What's analysed                                               |
|----------------|---------------------------------------------------------------|
| Dependencies   | package.json, lock file, dep count, flagged/duplicate packages |
| TypeScript     | tsconfig.json, strict mode, TS version, @types/node           |
| Git            | .git repo, .gitignore completeness, uncommitted changes        |
| Scripts        | build, test, lint, dev/start, typecheck                       |
| Structure      | src/, tests/, .env.example, root cleanliness                  |
| Security       | .env gitignore, hardcoded secrets, dangerous npm scripts       |

## Scoring

| Grade | Score  |
|-------|--------|
| A     | 90–100 |
| B     | 75–89  |
| C     | 60–74  |
| D     | 45–59  |
| F     | < 45   |

Exit code `0` = no failures; exit code `1` = one or more failing checks.

## License

MIT © Mario Tavarez
