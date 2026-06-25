import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { processLetterPdfJob } from '../src/jobs/letter-pdf';

function createPrismaMock() {
  const request = {
    id: 'letter-1',
    tenantId: 'tenant-1',
    requesterId: 'user-1',
    residentId: 'resident-1',
    letterTypeId: 'type-1',
    status: 'approved',
    purpose: 'Keperluan administrasi',
    letterType: { id: 'type-1', code: 'SKD', name: 'Surat Keterangan Domisili' },
    resident: {
      fullName: 'Budi Santoso',
      nik: '1234567890123456',
      address: { street: 'Jl. Desa', rt: '001', rw: '002' },
    },
    requester: { name: 'Operator Desa' },
  };

  return {
    letterRequest: {
      findFirst: async () => request,
      update: async () => ({}),
    },
    letterOutput: {
      findFirst: async () => null,
      create: async () => ({ id: 'output-1', fileId: 'file-1' }),
    },
    village: {
      findFirst: async () => ({ name: 'Desa Maju', address: 'Jl. Kantor Desa' }),
    },
    letterTemplate: {
      findFirst: async () => ({ id: 'template-1', content: 'Nama {{nama_pemohon}}', version: 1 }),
    },
    setting: {
      findUnique: async () => null,
    },
    letterNumberSequence: {
      upsert: async () => ({ lastNumber: 1 }),
    },
    file: {
      create: async () => ({ id: 'file-1' }),
    },
    auditLog: {
      create: async () => ({}),
    },
    $transaction: async (callback: (tx: unknown) => Promise<unknown>) => callback(prisma),
  };
}

const prisma = createPrismaMock();

describe('processLetterPdfJob', () => {
  it('fails when PDF rendering does not produce an output file', async () => {
    await assert.rejects(
      processLetterPdfJob(
        {
          prisma: prisma as never,
          pdfService: { generate: async () => Buffer.alloc(0) },
          storage: { uploadFile: async () => undefined },
          appUrl: 'http://localhost:3000',
          now: () => new Date('2026-06-24T00:00:00.000Z'),
          randomId: () => 'qr-code-1',
        },
        {
          type: 'letter-pdf-generation',
          letterId: 'letter-1',
          tenantId: 'tenant-1',
          requestedBy: 'user-1',
        },
      ),
      /did not produce an output file/,
    );
  });

  it('uploads and records metadata when PDF output exists', async () => {
    const uploads: string[] = [];
    const result = await processLetterPdfJob(
      {
        prisma: prisma as never,
        pdfService: { generate: async () => Buffer.from('%PDF-1.4') },
        storage: { uploadFile: async (_buffer, key) => void uploads.push(key) },
        appUrl: 'http://localhost:3000',
        now: () => new Date('2026-06-24T00:00:00.000Z'),
        randomId: () => 'qr-code-1',
      },
      {
        type: 'letter-pdf-generation',
        letterId: 'letter-1',
        tenantId: 'tenant-1',
        requestedBy: 'user-1',
      },
    );

    assert.equal(result.fileId, 'file-1');
    assert.equal(uploads.length, 1);
    assert.match(uploads[0], /tenant-1\/letters\/letter-1\/SKD-/);
  });
});
