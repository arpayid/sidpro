import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ComplaintsService } from '../src/modules/complaints/complaints.service.js';

const tenantId = '123e4567-e89b-12d3-a456-426614174000';
const otherTenantId = '123e4567-e89b-12d3-a456-426614174999';
const complaintId = '19f10a9d-e89b-12d3-a456-426614174000';
const user = {
  sub: '123e4567-e89b-12d3-a456-426614174111',
  email: 'admin@example.test',
  tenantId,
  roles: ['operator'],
  permissions: ['complaints.read', 'complaints.update', 'complaints.close', 'complaints.respond'],
};

function makeService(overrides: Record<string, unknown> = {}) {
  const prisma = {
    tenant: { findUnique: async () => ({ id: tenantId, code: 'desa-maju' }) },
    complaint: {
      findFirst: async () => ({
        id: complaintId,
        tenantId,
        title: 'Jalan rusak',
        reporterEmail: 'warga@example.test',
        reporterName: 'Warga',
        reporterPhone: '081234567890',
        status: 'submitted',
        createdAt: new Date('2026-06-01T00:00:00.000Z'),
        updatedAt: new Date('2026-06-01T00:00:00.000Z'),
      }),
      update: async (_args: unknown) => ({
        id: complaintId,
        status: 'verified',
        title: 'Jalan rusak',
      }),
      create: async (args: { data: Record<string, unknown> }) => ({ id: complaintId, ...args.data }),
    },
    complaintResponse: {
      create: async (args: { data: Record<string, unknown> }) => ({ id: 'response-id', ...args.data }),
      findMany: async () => [],
    },
    file: {
      findMany: async () => [],
      updateMany: async () => ({ count: 0 }),
    },
    user: { findFirst: async () => ({ id: user.sub, tenantId, status: 'active' }) },
    $transaction: async (input: unknown) => {
      if (typeof input === 'function') return input(prisma);
      return Promise.all(input as Promise<unknown>[]);
    },
    $queryRaw: async () => [],
    ...overrides,
  };
  const auditLogs = { log: async () => undefined };
  const filesService = { linkPublicComplaintFiles: async () => undefined };
  const notificationQueue = { enqueueComplaintStatusEmail: async () => undefined };
  return {
    service: new ComplaintsService(prisma as never, auditLogs as never, filesService as never, notificationQueue as never),
    prisma,
    filesService,
    notificationQueue,
  };
}

describe('ComplaintsService validation and public safety', () => {
  it('rejects invalid status transitions', async () => {
    const { service } = makeService();

    await assert.rejects(
      service.updateStatus(user, complaintId, { status: 'closed', closeReason: 'langsung tutup' }),
      BadRequestException,
    );
  });

  it('rejects invalid public tracking ticket', async () => {
    const { service } = makeService();

    await assert.rejects(
      service.trackPublic('desa-maju', { ticket: 'PGD-ABCD', reporterPhone: '081234567890' }),
      BadRequestException,
    );
  });

  it('hides complaint existence when public tracking phone does not match', async () => {
    const { service, prisma } = makeService();
    prisma.$queryRaw = async () => [
      {
        id: complaintId,
        title: 'Jalan rusak',
        category: 'infrastruktur',
        priority: 'medium',
        status: 'submitted',
        reporter_phone: '081234567890',
        created_at: new Date('2026-06-01T00:00:00.000Z'),
        updated_at: new Date('2026-06-01T00:00:00.000Z'),
        closed_at: null,
      },
    ];

    await assert.rejects(
      service.trackPublic('desa-maju', { ticket: 'PGD-19F10A9D', reporterPhone: '081999999999' }),
      NotFoundException,
    );
  });

  it('rejects cross-tenant public complaint file IDs', async () => {
    const fileId = '123e4567-e89b-12d3-a456-426614174222';
    const { service, filesService } = makeService();
    filesService.linkPublicComplaintFiles = async (scopeTenantId: string, _id: string, fileIds: string[]) => {
      assert.equal(scopeTenantId, tenantId);
      assert.deepEqual(fileIds, [fileId]);
      throw new BadRequestException('Lampiran tidak valid atau sudah digunakan');
    };

    await assert.rejects(
      service.createPublic('desa-maju', {
        title: 'Jalan rusak berat',
        description: 'Jalan utama desa rusak dan berbahaya',
        category: 'infrastruktur',
        reporterName: 'Budi',
        reporterPhone: '081234567890',
        reporterEmail: 'budi@example.test',
        fileIds: [fileId],
      }),
      BadRequestException,
    );
  });

  it('enqueues a notification when status changes for an email-backed public complaint', async () => {
    const calls: unknown[] = [];
    const { service, notificationQueue } = makeService();
    notificationQueue.enqueueComplaintStatusEmail = async (payload: unknown) => {
      calls.push(payload);
    };

    await service.updateStatus(user, complaintId, { status: 'verified', note: 'Sudah diverifikasi' });

    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0], {
      tenantId,
      complaintId,
      ticket: 'PGD-19F10A9D',
      title: 'Jalan rusak',
      reporterEmail: 'warga@example.test',
      reporterName: 'Warga',
      fromStatus: 'submitted',
      toStatus: 'verified',
      fromStatusLabel: 'Masuk',
      statusLabel: 'Diverifikasi',
      note: 'Sudah diverifikasi',
      appUrl: process.env.APP_URL,
    });
  });

  it('returns public tracking data without internal reporter, assignee, or tenant fields', async () => {
    const { service, prisma } = makeService();
    prisma.$queryRaw = async () => [
      {
        id: complaintId,
        title: 'Jalan rusak',
        category: 'infrastruktur',
        priority: 'medium',
        status: 'verified',
        reporter_phone: '081234567890',
        tenant_id: otherTenantId,
        assignee_id: user.sub,
        created_at: new Date('2026-06-01T00:00:00.000Z'),
        updated_at: new Date('2026-06-02T00:00:00.000Z'),
        closed_at: null,
      },
    ];

    const result = await service.trackPublic('desa-maju', {
      ticket: 'PGD-19F10A9D',
      reporterPhone: '+6281234567890',
    });

    const data = (result as { data: Record<string, unknown> }).data;
    assert.equal(data.ticket, 'PGD-19F10A9D');
    assert.equal('reporterPhone' in data, false);
    assert.equal('reporterEmail' in data, false);
    assert.equal('tenantId' in data, false);
    assert.equal('assigneeId' in data, false);
  });
});
