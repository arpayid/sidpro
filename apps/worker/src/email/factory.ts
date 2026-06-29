import type { EmailAdapter } from '@sidpro/types';
import { createConsoleEmailAdapter } from './console.adapter';
import { createDisabledEmailAdapter } from './disabled.adapter';
import { createSmtpEmailAdapter } from './smtp.adapter';

export function createEmailAdapter(): EmailAdapter {
  if (process.env.EMAIL_TRANSPORT === 'disabled') {
    return createDisabledEmailAdapter();
  }

  if (process.env.SMTP_HOST) {
    return createSmtpEmailAdapter();
  }

  if (process.env.NODE_ENV === 'production') {
    console.error(
      JSON.stringify({
        event: 'email_delivery_disabled',
        reason: 'smtp_host_missing',
      }),
    );
    return createDisabledEmailAdapter();
  }

  return createConsoleEmailAdapter();
}
