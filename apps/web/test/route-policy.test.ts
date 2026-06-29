import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isAdminRoute, sanitizeAdminCallback } from '../src/lib/route-policy.js';

describe('admin route policy', () => {
  it('recognizes only the admin route and its descendants', () => {
    assert.equal(isAdminRoute('/admin'), true);
    assert.equal(isAdminRoute('/admin/dashboard'), true);
    assert.equal(isAdminRoute('/adminish'), false);
    assert.equal(isAdminRoute('/'), false);
  });

  it('keeps same-origin admin callbacks including query and fragment', () => {
    assert.equal(sanitizeAdminCallback('/admin/dashboard?tab=overview#summary'), '/admin/dashboard?tab=overview#summary');
  });

  it('falls back for missing, non-admin, and external callback values', () => {
    for (const candidate of [null, '', '/', '/login', '/adminish', '//attacker.example/path', 'https://attacker.example/admin']) {
      assert.equal(sanitizeAdminCallback(candidate), '/admin');
    }
  });
});
