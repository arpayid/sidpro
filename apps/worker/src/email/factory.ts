import type { EmailAdapter } from '@sidpro/types';
import { createConsoleEmailAdapter } from './console.adapter';
import { createSmtpEmailAdapter } from './smtp.adapter';

export function createEmailAdapter(): EmailAdapter {
  if (process.env.SMTP_HOST) {
    return createSmtpEmailAdapter();
  }
  return createConsoleEmailAdapter();
}
