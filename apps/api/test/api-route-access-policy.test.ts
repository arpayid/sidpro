import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const sourceRoot = join(root, 'apps/api/src');

function walk(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return entry.name === 'node_modules' || entry.name === 'dist' ? [] : walk(path);
    return path.endsWith('.controller.ts') ? [path] : [];
  });
}

describe('AUDIT-3 controller access inventory', () => {
  it('keeps every controller in the audited inventory and requires an explicit access marker', () => {
    const controllers = walk(sourceRoot);
    assert.equal(controllers.length, 26, 'Update AUDIT-3 inventory when controllers change.');

    const violations = controllers.flatMap((path) => {
      const source = readFileSync(path, 'utf8');
      const hasExplicitAccess = source.includes('JwtAuthGuard') || source.includes('@Public()');
      return hasExplicitAccess ? [] : [path];
    });

    assert.deepEqual(violations, [], `Controllers missing an explicit JWT or public marker:\n${violations.join('\n')}`);
  });
});
