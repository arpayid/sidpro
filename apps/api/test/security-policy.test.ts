import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isAdminRole,
  parseRequire2FaAdminSetting,
} from '../src/core/auth/security-policy.util.js';

describe('security policy util', () => {
  it('detects admin roles', () => {
    assert.equal(isAdminRole(['operator_desa']), true);
    assert.equal(isAdminRole(['warga']), false);
  });

  it('parses require 2fa setting', () => {
    assert.equal(parseRequire2FaAdminSetting({ enabled: true }), true);
    assert.equal(parseRequire2FaAdminSetting({ enabled: false }), false);
    assert.equal(parseRequire2FaAdminSetting(true), true);
    assert.equal(parseRequire2FaAdminSetting(null), false);
  });
});
