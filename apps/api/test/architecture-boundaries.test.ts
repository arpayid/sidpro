import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, normalize, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url));
const apiSourceRoot = join(repositoryRoot, 'apps/api/src');
const sourceExtensions = ['.ts', '.tsx', '.js', '.jsx'];
const ignoredDirectories = new Set(['node_modules', 'dist', '.next', 'coverage', '.turbo']);

function walk(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      return ignoredDirectories.has(entry.name) ? [] : walk(path);
    }
    return sourceExtensions.includes(extname(entry.name)) ? [path] : [];
  });
}

function readImports(source: string): string[] {
  const imports = new Set<string>();
  const patterns = [
    /\bfrom\s*['"]([^'"]+)['"]/g,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /\brequire\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];

  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) imports.add(match[1]!);
  }
  return [...imports];
}

function resolveImport(from: string, specifier: string): string | null {
  let candidate: string | null = null;
  if (specifier.startsWith('@/')) {
    candidate = join(apiSourceRoot, specifier.slice(2));
  } else if (specifier.startsWith('.')) {
    candidate = resolve(dirname(from), specifier);
  }
  if (!candidate) return null;

  const candidates = [
    candidate,
    ...sourceExtensions.map((extension) => `${candidate}${extension}`),
    ...sourceExtensions.map((extension) => join(candidate, `index${extension}`)),
  ];
  return candidates.find((path) => existsSync(path)) ?? null;
}

function apiLayer(path: string): string {
  const file = relative(apiSourceRoot, path).replaceAll('\\', '/');
  if (file.startsWith('core/')) return 'core';
  if (file.startsWith('common/')) return 'common';
  if (file.startsWith('database/')) return 'database';
  if (file.startsWith('config/')) return 'config';
  if (file.startsWith('health/')) return 'health';
  const module = /^modules\/([^/]+)\//.exec(file)?.[1];
  return module ? `domain:${module}` : 'application';
}

function collectApiBoundaryViolations(): string[] {
  const violations: string[] = [];

  for (const file of walk(apiSourceRoot)) {
    const sourceLayer = apiLayer(file);
    for (const specifier of readImports(readFileSync(file, 'utf8'))) {
      const target = resolveImport(file, specifier);
      if (!target) continue;
      const targetLayer = apiLayer(target);
      const sourceLabel = relative(repositoryRoot, file).replaceAll('\\', '/');
      const targetLabel = relative(repositoryRoot, target).replaceAll('\\', '/');

      if (sourceLayer === 'core' && targetLayer.startsWith('domain:')) {
        violations.push(`${sourceLabel} (core) imports ${targetLabel} (${targetLayer})`);
      }

      if (sourceLayer.startsWith('domain:') && targetLayer.startsWith('domain:') && sourceLayer !== targetLayer) {
        violations.push(`${sourceLabel} (${sourceLayer}) imports ${targetLabel} (${targetLayer})`);
      }

      if (sourceLayer === 'common' && (targetLayer === 'core' || targetLayer.startsWith('domain:'))) {
        violations.push(`${sourceLabel} (common) imports ${targetLabel} (${targetLayer})`);
      }
    }
  }
  return violations;
}

function collectAppAndPackageViolations(): string[] {
  const violations: string[] = [];
  const scans = [
    { root: join(repositoryRoot, 'apps/web/src'), label: 'web', forbidden: ['apps/api/', 'apps/worker/'] },
    { root: join(repositoryRoot, 'apps/worker/src'), label: 'worker', forbidden: ['apps/api/', 'apps/web/'] },
    { root: join(repositoryRoot, 'packages'), label: 'shared-package', forbidden: ['apps/api/', 'apps/web/', 'apps/worker/'] },
  ];

  for (const scan of scans) {
    if (!existsSync(scan.root)) continue;
    for (const file of walk(scan.root)) {
      const source = readFileSync(file, 'utf8');
      for (const specifier of readImports(source)) {
        const resolved = specifier.startsWith('.') ? normalize(resolve(dirname(file), specifier)) : specifier;
        const normalized = String(resolved).replaceAll('\\', '/');
        if (scan.forbidden.some((forbidden) => normalized.includes(forbidden))) {
          violations.push(
            `${relative(repositoryRoot, file).replaceAll('\\', '/')} (${scan.label}) imports forbidden target ${specifier}`,
          );
        }
      }
    }
  }
  return violations;
}

describe('AUDIT-1 architecture boundaries', () => {
  it('keeps core independent from domain modules and domains independent from each other', () => {
    const violations = collectApiBoundaryViolations();
    assert.deepEqual(violations, [], `Architecture boundary violations:\n${violations.join('\n')}`);
  });

  it('keeps applications and shared packages from importing each other through source paths', () => {
    const violations = collectAppAndPackageViolations();
    assert.deepEqual(violations, [], `Application/package boundary violations:\n${violations.join('\n')}`);
  });

  it('keeps every declared source scan root as a directory', () => {
    for (const directory of [apiSourceRoot, join(repositoryRoot, 'apps/web/src'), join(repositoryRoot, 'apps/worker/src')]) {
      assert.equal(statSync(directory).isDirectory(), true, `${directory} must exist for boundary scanning`);
    }
  });
});
