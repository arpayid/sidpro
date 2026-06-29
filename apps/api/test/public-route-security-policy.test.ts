import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url));
const apiSourceRoot = join(repositoryRoot, 'apps/api/src');
const mutationDecorator = /^@(Post|Put|Patch|Delete)\(/;
const routeDecorator = /^@(Get|Post|Put|Patch|Delete)\(/;

function walk(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return entry.name === 'node_modules' || entry.name === 'dist' ? [] : walk(path);
    return path.endsWith('.controller.ts') ? [path] : [];
  });
}

function isMethodDeclaration(line: string): boolean {
  return /^(?:(?:public|private|protected)\s+)?(?:async\s+)?[A-Za-z_$][\w$]*\s*\(/.test(line);
}

function collectPublicMutationViolations(controllerPath: string): string[] {
  const source = readFileSync(controllerPath, 'utf8');
  const file = relative(repositoryRoot, controllerPath).replaceAll('\\', '/');
  const decorators: string[] = [];
  const violations: string[] = [];

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('//')) continue;

    if (line.startsWith('@')) {
      decorators.push(line);
      continue;
    }

    if (isMethodDeclaration(line)) {
      const publicRoute = decorators.some((decorator) => decorator.startsWith('@Public('));
      const mutation = decorators.some((decorator) => mutationDecorator.test(decorator));
      if (publicRoute && mutation && !decorators.some((decorator) => decorator.startsWith('@Throttle('))) {
        violations.push(`${file}: ${line.slice(0, line.indexOf('(')).trim()} is a public mutation without @Throttle`);
      }
      decorators.length = 0;
      continue;
    }

    if (!line.startsWith('*') && !line.startsWith('/*') && !routeDecorator.test(line)) {
      decorators.length = 0;
    }
  }

  return violations;
}

describe('AUDIT-4 public route security policy', () => {
  it('requires every public mutation endpoint to declare a route-specific throttle', () => {
    const violations = walk(apiSourceRoot).flatMap(collectPublicMutationViolations);
    assert.deepEqual(violations, [], `Public route rate-limit violations:\n${violations.join('\n')}`);
  });
});
