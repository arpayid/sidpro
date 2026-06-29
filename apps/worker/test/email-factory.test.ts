import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createEmailAdapter } from '../src/email/factory.js';

function withEnvironment(
  updates: Record<string, string | undefined>,
  action: () => void,
): void {
  const previous = Object.fromEntries(
    Object.keys(updates).map((key) => [key, process.env[key]]),
  );

  try {
    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    action();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

describe('email adapter factory', () => {
  it('uses the console adapter only outside production when SMTP is unavailable', () => {
    withEnvironment({ NODE_ENV: 'test', SMTP_HOST: undefined }, () => {
      const adapter = createEmailAdapter();
      assert.equal(typeof adapter.send, 'function');
    });
  });

  it('rejects console email transport in production', () => {
    withEnvironment({ NODE_ENV: 'production', SMTP_HOST: undefined }, () => {
      assert.throws(
        () => createEmailAdapter(),
        /SMTP_HOST is required in production/,
      );
    });
  });
});
