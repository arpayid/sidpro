import type { EmailAdapter } from '@sidpro/types';

/**
 * Explicit no-delivery adapter for controlled smoke or maintenance environments.
 * It intentionally does not log recipients, subjects, or bodies.
 */
export function createDisabledEmailAdapter(): EmailAdapter {
  return {
    async send() {
      return undefined;
    },
  };
}
