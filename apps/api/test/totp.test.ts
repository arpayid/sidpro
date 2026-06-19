import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildTotpUri,
  generateTotpSecret,
  generateTotpToken,
  verifyTotpToken,
} from '../src/core/auth/totp.util.js';

describe('totp helpers', () => {
  it('generates secret and verifies token', async () => {
    const secret = generateTotpSecret();
    const token = await generateTotpToken(secret);
    assert.equal(await verifyTotpToken(token, secret), true);
  });

  it('rejects invalid token', async () => {
    const secret = generateTotpSecret();
    assert.equal(await verifyTotpToken('000000', secret), false);
  });

  it('builds otpauth uri', () => {
    const uri = buildTotpUri('admin@demo-desa.id', 'TESTSECRET');
    assert.match(uri, /^otpauth:\/\/totp\//);
    assert.match(uri, /admin%40demo-desa\.id/);
  });
});
