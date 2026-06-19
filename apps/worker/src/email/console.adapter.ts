import type { EmailAdapter, EmailMessage } from '@sidpro/types';

export function createConsoleEmailAdapter(): EmailAdapter {
  return {
    async send(message: EmailMessage) {
      console.log('[email:console] Sending email');
      console.log(`  to: ${message.to}`);
      console.log(`  subject: ${message.subject}`);
      console.log('  body:');
      console.log(message.text);
    },
  };
}
