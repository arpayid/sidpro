import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createEmailAdapter } from '../src/email/factory.js';

function withEnvironment(
  updates: Record<string, string | undefined>,
  action: () => void | Promise<void>,
): void | Promise<void> {
  const previous = Object.fromEntries(
    Object.keys(updates).map((key) => [key, process.env[key]]),
  );

  const restore = () => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  };

  try {
    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    const result = action();
    if (result instanceof Promise) return result.finally(restore);
    restore();
    return result;
  } catch (error) {
    restore();
    throw error;
  }
}

describe('email adapter factory', () => {
  it('uses the console adapter only outside production when SMTP is unavailable', () => {
    withEnvironment({ NODE_ENV: 'test', SMTP_HOST: undefined, EMAIL_TRANSPORT: undefined }, () => {
      const adapter = createEmailAdapter();
      assert.equal(typeof adapter.send, 'function');
    });
  });

  it('uses a redacted no-delivery adapter instead of console email in production without SMTP', async () => {
    const events: string[] = [];
    const originalError = console.error;
    console.error = (...args: Parameters<typeof console.error>) => {
      events.push(args.map(String).join(' '));
    };

    try {
      await withEnvironment(
        { NODE_ENV: 'production', SMTP_HOST: undefined, EMAIL_TRANSPORT: undefined },
        async () => {
          const adapter = createEmailAdapter();
          await assert.doesNotReject(() =>
            adapter.send({
              to: 'ci-smoke@example.test',
              subject: 'Smoke notification',
              text: 'This content must not be logged by the production fallback.',
            }),
          );
        },
      );
    } finally {
      console.error = originalError;
    }

    assert.equal(events.length, 1);
    assert.match(events[0] ?? '', /email_delivery_disabled/);
    assert.doesNotMatch(events[0] ?? '', /ci-smoke@example\.test|Smoke notification|content/);
  });

  it('allows the explicit no-delivery transport for controlled production smoke checks', async () => {
    await withEnvironment(
      { NODE_ENV: 'production', SMTP_HOST: undefined, EMAIL_TRANSPORT: 'disabled' },
      async () => {
        const adapter = createEmailAdapter();
        await assert.doesNotReject(() =>
          adapter.send({
            to: 'ci-smoke@example.test',
            subject: 'Smoke notification',
            text: 'This content must not be logged by the disabled adapter.',
          }),
        );
      },
    );
  });
});
