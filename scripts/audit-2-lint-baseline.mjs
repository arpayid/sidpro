import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const outputDirectory = resolve(root, 'audit-2-artifacts/lint');
const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';

const targets = [
  '@sidpro/api',
  '@sidpro/web',
  '@sidpro/worker',
  '@sidpro/types',
  '@sidpro/validators',
  '@sidpro/ui',
  '@sidpro/config',
];

function safeFilename(workspace) {
  return workspace.replace(/^@/, '').replace(/[^A-Za-z0-9._-]+/g, '-');
}

function increment(map, key) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function sortedEntries(map) {
  return [...map.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([ruleId, count]) => ({ ruleId, count }));
}

mkdirSync(outputDirectory, { recursive: true });

const targetReports = [];
const totals = {
  files: 0,
  errors: 0,
  warnings: 0,
  fatalInvocations: 0,
};
const warningsByRule = new Map();
const errorsByRule = new Map();
let shouldFail = false;

for (const workspace of targets) {
  const result = spawnSync(
    pnpm,
    ['--filter', workspace, 'exec', 'eslint', '.', '--format', 'json'],
    {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 25 * 1024 * 1024,
    },
  );

  const name = safeFilename(workspace);
  const stdoutPath = resolve(outputDirectory, `${name}.json`);
  const stderrPath = resolve(outputDirectory, `${name}.stderr.log`);
  writeFileSync(stdoutPath, result.stdout ?? '');
  writeFileSync(stderrPath, result.stderr ?? '');

  let eslintFiles = [];
  let parseError = null;
  try {
    eslintFiles = JSON.parse(result.stdout || '[]');
  } catch (error) {
    parseError = error instanceof Error ? error.message : String(error);
  }

  let errors = 0;
  let warnings = 0;
  const localWarnings = new Map();
  const localErrors = new Map();

  for (const file of Array.isArray(eslintFiles) ? eslintFiles : []) {
    for (const message of file.messages ?? []) {
      const ruleId = message.ruleId ?? '<configuration-or-parser>';
      if (message.severity === 2) {
        errors += 1;
        increment(localErrors, ruleId);
        increment(errorsByRule, ruleId);
      } else if (message.severity === 1) {
        warnings += 1;
        increment(localWarnings, ruleId);
        increment(warningsByRule, ruleId);
      }
    }
  }

  const invocationFailed = Boolean(result.error) || result.status === null || result.status > 1 || parseError !== null;
  if (invocationFailed) {
    shouldFail = true;
    totals.fatalInvocations += 1;
  }
  if (errors > 0) {
    shouldFail = true;
  }

  totals.files += Array.isArray(eslintFiles) ? eslintFiles.length : 0;
  totals.errors += errors;
  totals.warnings += warnings;

  targetReports.push({
    workspace,
    exitCode: result.status,
    files: Array.isArray(eslintFiles) ? eslintFiles.length : 0,
    errors,
    warnings,
    invocationFailed,
    parseError,
    warningsByRule: sortedEntries(localWarnings),
    errorsByRule: sortedEntries(localErrors),
  });
}

const summary = {
  schemaVersion: 1,
  targets: targetReports,
  totals: {
    ...totals,
    warningsByRule: sortedEntries(warningsByRule),
    errorsByRule: sortedEntries(errorsByRule),
  },
};

const summaryPath = resolve(root, 'audit-2-artifacts/lint-summary.json');
writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));

if (shouldFail) {
  process.exitCode = 1;
}
