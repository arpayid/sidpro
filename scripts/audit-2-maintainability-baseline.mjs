import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const repositoryRoot = process.cwd();
const outputDirectory = resolve(repositoryRoot, 'audit-2-artifacts/maintainability');
const sourceRoots = [
  'apps/api/src',
  'apps/web/src',
  'apps/worker/src',
  'packages/types/src',
  'packages/validators/src',
  'packages/ui/src',
];
const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs']);
const ignoredDirectories = new Set(['node_modules', 'dist', '.next', 'coverage', '.turbo', '.git']);
const largeFileCodeLineThreshold = 400;
const hotspotSignalThreshold = 30;

function extensionOf(path) {
  const lastDot = path.lastIndexOf('.');
  return lastDot >= 0 ? path.slice(lastDot) : '';
}

function walk(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return ignoredDirectories.has(entry.name) ? [] : walk(path);
    return sourceExtensions.has(extensionOf(path)) ? [path] : [];
  });
}

function countMatches(source, expression) {
  return [...source.matchAll(expression)].length;
}

function codeLines(source) {
  let insideBlockComment = false;
  return source.split(/\r?\n/).filter((rawLine) => {
    const line = rawLine.trim();
    if (!line) return false;
    if (insideBlockComment) {
      if (line.includes('*/')) insideBlockComment = false;
      return false;
    }
    if (line.startsWith('/*')) {
      if (!line.includes('*/')) insideBlockComment = true;
      return false;
    }
    return !line.startsWith('//') && !line.startsWith('*');
  }).length;
}

function controlFlowSignals(source) {
  return countMatches(
    source,
    /\bif\s*\(|\belse\s+if\b|\bfor\s*\(|\bwhile\s*\(|\bcatch\s*\(|\bcase\b|&&|\|\|/g,
  );
}

function analyzeFile(path) {
  const source = readFileSync(path, 'utf8');
  const relativePath = relative(repositoryRoot, path).replaceAll('\\', '/');
  const codeLineCount = codeLines(source);
  return {
    path: relativePath,
    codeLines: codeLineCount,
    bytes: Buffer.byteLength(source),
    controlFlowSignals: controlFlowSignals(source),
    explicitAny: countMatches(source, /\bas\s+any\b|:\s*any\b|<any>/g),
    tsSuppressions: countMatches(source, /@ts-(?:ignore|expect-error)\b/g),
    eslintSuppressions: countMatches(source, /eslint-disable(?:-next-line|-line)?\b/g),
    debuggerStatements: countMatches(source, /\bdebugger\s*;/g),
    consoleCalls: countMatches(source, /\bconsole\.(?:log|warn|error|info|debug)\s*\(/g),
    todoMarkers: countMatches(source, /\b(?:TODO|FIXME|HACK|XXX)\b/gi),
    exactContentHash: createHash('sha256').update(source).digest('hex'),
  };
}

function sum(files, key) {
  return files.reduce((total, file) => total + file[key], 0);
}

function filesWithSignal(files, key) {
  return files
    .filter((file) => file[key] > 0)
    .map((file) => ({ path: file.path, count: file[key] }))
    .sort((left, right) => right.count - left.count || left.path.localeCompare(right.path));
}

function buildDuplicateGroups(files) {
  const groups = new Map();
  for (const file of files) {
    const paths = groups.get(file.exactContentHash) ?? [];
    paths.push(file.path);
    groups.set(file.exactContentHash, paths);
  }
  return [...groups.entries()]
    .filter(([, paths]) => paths.length > 1)
    .map(([hash, paths]) => ({ hash, paths: paths.sort() }))
    .sort((left, right) => right.paths.length - left.paths.length || left.hash.localeCompare(right.hash));
}

function markdownTable(rows) {
  if (!rows.length) return '_None observed._';
  return [
    '| File | Code lines | Control-flow signals | Explicit `any` | Suppressions |',
    '| --- | ---: | ---: | ---: | ---: |',
    ...rows.map((file) =>
      `| \`${file.path}\` | ${file.codeLines} | ${file.controlFlowSignals} | ${file.explicitAny} | ${file.tsSuppressions + file.eslintSuppressions} |`,
    ),
  ].join('\n');
}

function signalTable(rows, label) {
  if (!rows.length) return '_None observed._';
  return [
    `| File | ${label} |`,
    '| --- | ---: |',
    ...rows.map((file) => `| \`${file.path}\` | ${file.count} |`),
  ].join('\n');
}

const sourceFiles = sourceRoots.flatMap((root) => walk(resolve(repositoryRoot, root))).sort();
const files = sourceFiles.map(analyzeFile);
const largestFiles = [...files]
  .filter((file) => file.codeLines >= largeFileCodeLineThreshold)
  .sort((left, right) => right.codeLines - left.codeLines || left.path.localeCompare(right.path));
const controlFlowHotspots = [...files]
  .filter((file) => file.controlFlowSignals >= hotspotSignalThreshold)
  .sort(
    (left, right) =>
      right.controlFlowSignals - left.controlFlowSignals || right.codeLines - left.codeLines || left.path.localeCompare(right.path),
  );
const duplicateGroups = buildDuplicateGroups(files);
const signalFiles = {
  explicitAny: filesWithSignal(files, 'explicitAny'),
  tsSuppressions: filesWithSignal(files, 'tsSuppressions'),
  eslintSuppressions: filesWithSignal(files, 'eslintSuppressions'),
  debuggerStatements: filesWithSignal(files, 'debuggerStatements'),
  consoleCalls: filesWithSignal(files, 'consoleCalls'),
  todoMarkers: filesWithSignal(files, 'todoMarkers'),
};

const summary = {
  schemaVersion: 2,
  generatedAt: new Date().toISOString(),
  scope: {
    sourceRoots,
    extensions: [...sourceExtensions].sort(),
    ignoredDirectories: [...ignoredDirectories].sort(),
  },
  thresholds: {
    largeFileCodeLineThreshold,
    hotspotSignalThreshold,
  },
  totals: {
    sourceFiles: files.length,
    codeLines: sum(files, 'codeLines'),
    bytes: sum(files, 'bytes'),
    explicitAny: sum(files, 'explicitAny'),
    tsSuppressions: sum(files, 'tsSuppressions'),
    eslintSuppressions: sum(files, 'eslintSuppressions'),
    debuggerStatements: sum(files, 'debuggerStatements'),
    consoleCalls: sum(files, 'consoleCalls'),
    todoMarkers: sum(files, 'todoMarkers'),
    exactDuplicateGroups: duplicateGroups.length,
    duplicateFilesBeyondFirst: duplicateGroups.reduce((total, group) => total + group.paths.length - 1, 0),
  },
  largeFiles: largestFiles,
  controlFlowHotspots,
  signalFiles,
  exactDuplicateGroups: duplicateGroups,
  notes: [
    'This is an inventory baseline, not a release-blocking complexity, duplicate-code, or typed-debt threshold.',
    'controlFlowSignals is a lightweight lexical indicator; it is not cyclomatic or cognitive complexity.',
    'exactDuplicateGroups compares full file content hashes only; it intentionally does not claim semantic duplication.',
    'Signal inventories show file counts, not source-line attribution; manual classification remains required before policy changes.',
  ],
};

mkdirSync(outputDirectory, { recursive: true });
writeFileSync(join(outputDirectory, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
writeFileSync(
  join(outputDirectory, 'summary.md'),
  `# AUDIT-2 Maintainability Baseline\n\n` +
    `Generated: ${summary.generatedAt}\n\n` +
    `## Totals\n\n` +
    `| Metric | Count |\n| --- | ---: |\n` +
    Object.entries(summary.totals)
      .map(([metric, value]) => `| ${metric} | ${value} |`)
      .join('\n') +
    `\n\n## Largest Source Files (>= ${largeFileCodeLineThreshold} code lines)\n\n` +
    markdownTable(largestFiles) +
    `\n\n## Heuristic Control-Flow Hotspots (>= ${hotspotSignalThreshold} signals)\n\n` +
    markdownTable(controlFlowHotspots) +
    `\n\n## Files With Console Calls\n\n` +
    signalTable(signalFiles.consoleCalls, 'Console calls') +
    `\n\n## Files With Explicit Typed-Debt or Suppression Signals\n\n` +
    `### Explicit \`any\`\n\n${signalTable(signalFiles.explicitAny, 'Occurrences')}\n\n` +
    `### TypeScript suppressions\n\n${signalTable(signalFiles.tsSuppressions, 'Occurrences')}\n\n` +
    `### ESLint suppressions\n\n${signalTable(signalFiles.eslintSuppressions, 'Occurrences')}\n\n` +
    `### Debugger statements\n\n${signalTable(signalFiles.debuggerStatements, 'Occurrences')}\n\n` +
    `### TODO/FIXME/HACK/XXX markers\n\n${signalTable(signalFiles.todoMarkers, 'Occurrences')}\n\n` +
    `## Exact Duplicate File Groups\n\n` +
    (duplicateGroups.length
      ? duplicateGroups.map((group) => `- ${group.paths.map((path) => `\`${path}\``).join(', ')}`).join('\n')
      : '_None observed._') +
    `\n\n## Interpretation Limits\n\n` +
    summary.notes.map((note) => `- ${note}`).join('\n') +
    `\n`,
);

console.log(`AUDIT-2 maintainability baseline: ${files.length} source files, ${summary.totals.codeLines} code lines.`);
console.log(`Artifacts: ${relative(repositoryRoot, outputDirectory).replaceAll('\\', '/')}`);
