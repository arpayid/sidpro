import type { ComplaintStatusEmailJob } from '@sidpro/types';
import type { EmailAdapter } from '@sidpro/types';
import { buildComplaintStatusEmail } from '../email/complaint-status-email';

export async function processComplaintStatusEmail(
  adapter: EmailAdapter,
  job: ComplaintStatusEmailJob,
) {
  if (!job.reporterEmail) {
    return { status: 'skipped', reason: 'missing_reporter_email' };
  }

  const message = buildComplaintStatusEmail(job);
  await adapter.send(message);
  return { status: 'sent', to: job.reporterEmail, ticket: job.ticket };
}
