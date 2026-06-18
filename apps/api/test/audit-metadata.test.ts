import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeAuditMetadata } from '../src/core/audit-logs/audit-metadata.util.js';

describe('audit metadata sanitization', () => {
  it('redacts password and token fields', () => {
    const result = sanitizeAuditMetadata({
      password: 'secret123',
      accessToken: 'eyJhbG',
      letterNumber: 'SKD/2026/0001',
    }) as Record<string, unknown>;

    assert.equal(result.password, '[REDACTED]');
    assert.equal(result.accessToken, '[REDACTED]');
    assert.equal(result.letterNumber, 'SKD/2026/0001');
  });

  it('masks nik in metadata', () => {
    const result = sanitizeAuditMetadata({ nik: '3201010101010001' }) as Record<string, unknown>;
    assert.equal(result.nik, '3201********0001');
  });
});
