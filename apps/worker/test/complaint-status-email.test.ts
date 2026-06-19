import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { ComplaintStatusEmailJob } from '@sidpro/types';
import { buildComplaintStatusEmail } from '../src/email/complaint-status-email';

describe('buildComplaintStatusEmail', () => {
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

  it('builds subject and recipient', () => {
    const message = buildComplaintStatusEmail(baseJob);
    assert.equal(message.to, 'warga@example.com');
    assert.match(message.subject, /PGD-ABC12345/);
    assert.match(message.subject, /Diverifikasi/);
  });

  it('includes status transition and tracking link', () => {
    const message = buildComplaintStatusEmail(baseJob);
    assert.match(message.text, /Masuk → Diverifikasi/);
    assert.match(message.text, /pengaduan\/cek\?ticket=PGD-ABC12345/);
    assert.match(message.text, /Pengaduan sedang diverifikasi/);
  });
});
