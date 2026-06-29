import type { EmailAdapter } from '@sidpro/types';
import { createConsoleEmailAdapter } from './console.adapter';
import { createSmtpEmailAdapter } from './smtp.adapter';

export function createEmailAdapter(): EmailAdapter {
  if (process.env.SMTP_HOST) {
    return createSmtpEmailAdapter();
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('SMTP_HOST is required in production; console email transport is disabled.');
  }

  return createConsoleEmailAdapter();
}
