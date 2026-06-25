import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { ComplaintStatusEmailJob, EmailMessage } from '@sidpro/types';
import { processComplaintStatusEmail } from '../src/jobs/complaint-status-email';

const baseJob: ComplaintStatusEmailJob = {
  type: 'complaint-status-email',
  tenantId: 'tenant-1',
  complaintId: 'abc12345-0000-0000-0000-000000000000',
  ticket: 'PGD-ABC12345',
  title: 'Jalan berlubang',
  reporterEmail: 'warga@example.com',
  reporterName: 'Budi',
  fromStatus: 'submitted',
  toStatus: 'verified',
  fromStatusLabel: 'Masuk',
  statusLabel: 'Diverifikasi',
  note: 'Pengaduan sedang diverifikasi.',
  appUrl: 'http://localhost:3000',
};

describe('processComplaintStatusEmail', () => {
  it('processes complaint-status-email with an email adapter', async () => {
    const sent: EmailMessage[] = [];

    const result = await processComplaintStatusEmail(
      {
        async send(message) {
          sent.push(message);
        },
      },
      baseJob,
    );

    assert.deepEqual(result, {
      status: 'sent',
      to: 'warga@example.com',
      ticket: 'PGD-ABC12345',
    });
    assert.equal(sent.length, 1);
    assert.equal(sent[0]?.to, 'warga@example.com');
    assert.match(sent[0]?.subject ?? '', /PGD-ABC12345/);
  });

  it('skips delivery when reporterEmail is missing', async () => {
    const result = await processComplaintStatusEmail(
      {
        async send() {
          throw new Error('send should not be called without reporterEmail');
        },
      },
      { ...baseJob, reporterEmail: '' },
    );

    assert.deepEqual(result, { status: 'skipped', reason: 'missing_reporter_email' });
  });
});
