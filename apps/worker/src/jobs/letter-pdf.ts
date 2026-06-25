import { createHash, randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

interface LetterPdfJob {
  type: 'letter-pdf-generation';
  letterId: string;
  tenantId: string;
  requestedBy: string;
  templateId?: string;
  templateVersion?: number;
}

const dynamicImport = new Function('specifier', 'return import(specifier)') as (
  specifier: string,
) => Promise<Record<string, unknown>>;

interface WorkerConfig {
  appUrl: string;
  storageBucket: string;
  minioEndpoint: string;
  minioPort: string;
  minioUseSsl: boolean;
  minioAccessKey: string;
  minioSecretKey: string;
}

interface StorageAdapter {
  uploadFile(buffer: Buffer, key: string, mimeType: string): Promise<void>;
}

interface LetterPdfProcessorDeps {
  prisma: PrismaClient;
  pdfService: { generate(input: LetterPdfInput): Promise<Buffer> };
  storage: StorageAdapter;
  now?: () => Date;
  randomId?: () => string;
  appUrl: string;
}

interface SignatoryConfig {
  name?: string;
  title?: string;
}

interface LetterPdfConfig {
  maskNik?: boolean;
}

interface LetterHeaderConfig {
  useCustom?: boolean;
  name?: string;
  address?: string;
  province?: string;
  regency?: string;
  district?: string;
}

interface LetterPdfVillage {
  name: string;
  address?: string | null;
  regency?: string | null;
  district?: string | null;
  province?: string | null;
}

interface LetterPdfInput {
  village: LetterPdfVillage;
  letterTypeName: string;
  letterNumber: string;
  purpose: string;
  templateContent: string;
  applicant: { fullName: string; nik?: string | null; address?: string | null };
  signatory: { name: string; title: string };
  issuedAt: Date;
  verificationUrl: string;
  qrCode: string;
}

const DEFAULT_LETTER_TEMPLATE = `Yang bertanda tangan di bawah ini, Kepala {{nama_desa}}, menerangkan bahwa:

Nama        : {{nama_pemohon}}
NIK         : {{nik}}
Alamat      : {{alamat_pemohon}}

Keperluan   : {{keperluan}}

Demikian surat keterangan ini dibuat untuk dipergunakan sebagaimana mestinya.`;
const OUTPUT_OWNER_TYPE = 'letter_output';

export function parseLetterPdfJob(data: unknown): LetterPdfJob {
  const job = data as Partial<LetterPdfJob> | null;
  if (!job || job.type !== 'letter-pdf-generation') {
    throw new Error('Invalid PDF job type');
  }
  if (!job.letterId || !job.tenantId || !job.requestedBy) {
    throw new Error('PDF job requires letterId, tenantId, and requestedBy');
  }
  return {
    type: 'letter-pdf-generation',
    letterId: job.letterId,
    tenantId: job.tenantId,
    requestedBy: job.requestedBy,
    templateId: job.templateId,
    templateVersion: job.templateVersion,
  };
}

function maskNik(nik: string): string {
  if (nik.length <= 8) return nik;
  return `${nik.slice(0, 4)}${'*'.repeat(Math.max(nik.length - 8, 0))}${nik.slice(-4)}`;
}

function buildVerificationUrl(appUrl: string, qrCode: string): string {
  return `${appUrl.replace(/\/$/, '')}/verifikasi-surat?code=${encodeURIComponent(qrCode)}`;
}

function resolvePdfVillage(
  village: {
    name: string;
    address?: string | null;
    regency?: string | null;
    district?: string | null;
    province?: string | null;
  },
  header: LetterHeaderConfig,
): LetterPdfVillage {
  if (!header.useCustom) return village;
  return {
    name: header.name?.trim() || village.name,
    address: header.address?.trim() || village.address,
    regency: header.regency?.trim() || village.regency,
    district: header.district?.trim() || village.district,
    province: header.province?.trim() || village.province,
  };
}

function addressText(
  address?: { street?: string | null; rt?: string | null; rw?: string | null } | null,
) {
  return address
    ? [address.street, address.rt ? `RT ${address.rt}` : null, address.rw ? `RW ${address.rw}` : null]
        .filter(Boolean)
        .join(', ')
    : null;
}

async function getLetterSettings(prisma: PrismaClient, tenantId: string) {
  const [signatorySetting, pdfSetting, headerSetting] = await Promise.all([
    prisma.setting.findUnique({ where: { tenantId_key: { tenantId, key: 'letters.signatory' } } }),
    prisma.setting.findUnique({ where: { tenantId_key: { tenantId, key: 'letters.pdf' } } }),
    prisma.setting.findUnique({ where: { tenantId_key: { tenantId, key: 'letters.header' } } }),
  ]);

  const signatory = (signatorySetting?.value ?? {}) as SignatoryConfig;
  const pdf = (pdfSetting?.value ?? {}) as LetterPdfConfig;
  const header = (headerSetting?.value ?? {}) as LetterHeaderConfig;

  return {
    signatory: {
      name: signatory.name ?? 'Kepala Desa',
      title: signatory.title ?? 'Kepala Desa',
    },
    pdf: { maskNik: pdf.maskNik ?? false },
    header: { useCustom: header.useCustom ?? false, ...header },
  };
}

async function allocateLetterNumber(
  prisma: PrismaClient,
  tenantId: string,
  letterTypeId: string,
  code: string,
) {
  const year = new Date().getFullYear();
  const sequence = await prisma.letterNumberSequence.upsert({
    where: { tenantId_letterTypeId_year: { tenantId, letterTypeId, year } },
    create: { tenantId, letterTypeId, year, lastNumber: 1 },
    update: { lastNumber: { increment: 1 } },
  });
  return `${code}/${year}/${String(sequence.lastNumber).padStart(4, '0')}`;
}

export async function processLetterPdfJob(deps: LetterPdfProcessorDeps, data: unknown) {
  const job = parseLetterPdfJob(data);
  const request = await deps.prisma.letterRequest.findFirst({
    where: { id: job.letterId, tenantId: job.tenantId },
    include: {
      letterType: true,
      resident: { include: { address: true } },
      requester: { select: { name: true } },
    },
  });

  if (!request) throw new Error('Letter request not found for tenant');
  if (request.status !== 'approved') throw new Error('Letter request must be approved before PDF generation');

  const existingOutput = await deps.prisma.letterOutput.findFirst({
    where: { letterRequestId: job.letterId, tenantId: job.tenantId },
  });
  if (existingOutput?.fileId) throw new Error('Letter PDF already generated');

  const [village, template, settings] = await Promise.all([
    deps.prisma.village.findFirst({ where: { tenantId: job.tenantId } }),
    deps.prisma.letterTemplate.findFirst({
      where: {
        tenantId: job.tenantId,
        letterTypeId: request.letterTypeId,
        isActive: true,
        ...(job.templateId ? { id: job.templateId } : {}),
        ...(job.templateVersion ? { version: job.templateVersion } : {}),
      },
      orderBy: { version: 'desc' },
    }),
    getLetterSettings(deps.prisma, job.tenantId),
  ]);

  if (!village) throw new Error('Village profile is required before PDF generation');
  const templateContent = template?.content ?? DEFAULT_LETTER_TEMPLATE;
  if (!templateContent.trim()) throw new Error('Letter template is invalid');

  const letterNumber = await allocateLetterNumber(
    deps.prisma,
    job.tenantId,
    request.letterTypeId,
    request.letterType.code,
  );
  const qrCode = deps.randomId?.() ?? randomUUID();
  const issuedAt = deps.now?.() ?? new Date();
  const residentNik = request.resident?.nik;
  const pdfBuffer = await deps.pdfService.generate({
    village: resolvePdfVillage(village, settings.header),
    letterTypeName: request.letterType.name,
    letterNumber,
    purpose: request.purpose,
    templateContent,
    applicant: {
      fullName: request.resident?.fullName ?? request.requester?.name ?? 'Pemohon',
      nik: residentNik ? (settings.pdf.maskNik ? maskNik(residentNik) : residentNik) : '-',
      address: addressText(request.resident?.address),
    },
    signatory: settings.signatory,
    issuedAt,
    verificationUrl: buildVerificationUrl(deps.appUrl, qrCode),
    qrCode,
  });

  if (!pdfBuffer.length) throw new Error('PDF generation did not produce an output file');

  const storageKey = `${job.tenantId}/letters/${job.letterId}/${letterNumber.replace(/\//g, '-')}.pdf`;
  const checksum = createHash('sha256').update(pdfBuffer).digest('hex');
  await deps.storage.uploadFile(pdfBuffer, storageKey, 'application/pdf');

  const output = await deps.prisma.$transaction(async (tx) => {
    const file = await tx.file.create({
      data: {
        tenantId: job.tenantId,
        ownerType: OUTPUT_OWNER_TYPE,
        ownerId: job.letterId,
        path: storageKey,
        mimeType: 'application/pdf',
        size: pdfBuffer.length,
        checksum,
      },
    });

    await tx.letterRequest.update({
      where: { id: job.letterId },
      data: { letterNumber, status: 'completed', completedAt: issuedAt },
    });

    return tx.letterOutput.create({
      data: {
        tenantId: job.tenantId,
        letterRequestId: job.letterId,
        qrCode,
        fileId: file.id,
        signedAt: issuedAt,
      },
    });
  });

  await deps.prisma.auditLog.create({
    data: {
      tenantId: job.tenantId,
      actorId: job.requestedBy,
      action: 'generate',
      module: 'letters',
      entityType: 'letter_output',
      entityId: output.id,
      metadata: {
        letterNumber,
        qrCode: qrCode.slice(0, 8),
        fileId: output.fileId,
        fileSize: pdfBuffer.length,
      },
    },
  });

  return { letterNumber, outputId: output.id, fileId: output.fileId, storageKey };
}

class S3StorageAdapter implements StorageAdapter {
  constructor(private readonly config: WorkerConfig) {}

  async uploadFile(buffer: Buffer, key: string, mimeType: string) {
    const s3Module = await dynamicImport('@aws-sdk/client-s3');
    const S3Client = s3Module.S3Client as new (config: Record<string, unknown>) => {
      send(command: unknown): Promise<unknown>;
    };
    const PutObjectCommand = s3Module.PutObjectCommand as new (
      input: Record<string, unknown>,
    ) => unknown;
    const protocol = this.config.minioUseSsl ? 'https' : 'http';
    const client = new S3Client({
      endpoint: `${protocol}://${this.config.minioEndpoint}:${this.config.minioPort}`,
      region: 'us-east-1',
      credentials: { accessKeyId: this.config.minioAccessKey, secretAccessKey: this.config.minioSecretKey },
      forcePathStyle: true,
    });
    await client.send(
      new PutObjectCommand({
        Bucket: this.config.storageBucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      }),
    );
  }
}

async function renderLetterPdf(input: LetterPdfInput): Promise<Buffer> {
  const pdfkitModule = await dynamicImport('pdfkit');
  const qrCodeModule = await dynamicImport('qrcode');
  const PDFDocument = pdfkitModule.default as new (options: Record<string, unknown>) => {
    page: { margins: { left: number; bottom: number }; height: number };
    on(event: string, callback: (...args: Buffer[]) => void): void;
    fontSize(size: number): {
      font(name: string): { text(text: string, options?: Record<string, unknown>): unknown };
      text(text: string, options?: Record<string, unknown>): unknown;
    };
    font(name: string): { text(text: string, options?: Record<string, unknown>): unknown };
    moveDown(lines?: number): unknown;
    text(text: string, options?: Record<string, unknown>): unknown;
    image(buffer: Buffer, x: number, y: number, options: Record<string, unknown>): unknown;
    end(): void;
  };
  const QRCode = qrCodeModule as { toBuffer(value: string, options: Record<string, unknown>): Promise<Buffer> };
  const renderedBody = input.templateContent.replace(/\{\{(\w+)\}\}/g, (_match: string, key: string) => {
    const vars: Record<string, string> = {
      nama_desa: input.village.name,
      alamat_desa: input.village.address ?? '-',
      kabupaten: input.village.regency ?? '-',
      kecamatan: input.village.district ?? '-',
      provinsi: input.village.province ?? '-',
      jenis_surat: input.letterTypeName,
      nomor_surat: input.letterNumber,
      nama_pemohon: input.applicant.fullName,
      nik: input.applicant.nik ?? '-',
      alamat_pemohon: input.applicant.address ?? '-',
      keperluan: input.purpose,
      tanggal: input.issuedAt.toISOString().slice(0, 10),
    };
    return vars[key] ?? '';
  });
  const qrBuffer = await QRCode.toBuffer(input.verificationUrl, { width: 140, margin: 1 });

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 56 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc
      .fontSize(13)
      .font('Helvetica-Bold')
      .text(`DESA ${input.village.name.toUpperCase()}`, { align: 'center' });
    if (input.village.address) {
      doc.fontSize(9).font('Helvetica').text(input.village.address, { align: 'center' });
    }
    doc.moveDown(1.5);
    doc.fontSize(12).font('Helvetica-Bold').text(input.letterTypeName.toUpperCase(), { align: 'center' });
    doc.fontSize(10).font('Helvetica').text(`Nomor: ${input.letterNumber}`, { align: 'center' });
    doc.moveDown(1.2);
    doc.fontSize(11).text(renderedBody, { align: 'justify', lineGap: 4 });
    doc.moveDown(2);
    doc.text(input.signatory.name, { align: 'right' });
    doc.text(input.signatory.title, { align: 'right' });
    doc.image(qrBuffer, doc.page.margins.left, doc.page.height - doc.page.margins.bottom - 116, {
      width: 88,
      height: 88,
    });
    doc.end();
  });
}

export function createLetterPdfProcessor() {
  const config: WorkerConfig = {
    appUrl: process.env.APP_URL ?? 'http://localhost:3000',
    storageBucket: process.env.MINIO_BUCKET ?? 'sidpro-files',
    minioEndpoint: process.env.MINIO_ENDPOINT ?? 'localhost',
    minioPort: process.env.MINIO_PORT ?? '9000',
    minioUseSsl: process.env.MINIO_USE_SSL === 'true',
    minioAccessKey: process.env.MINIO_ROOT_USER ?? '',
    minioSecretKey: process.env.MINIO_ROOT_PASSWORD ?? '',
  };
  const prisma = new PrismaClient();
  return {
    process: (data: unknown) =>
      processLetterPdfJob({
        prisma,
        pdfService: {
          generate: async (input) => {
            return renderLetterPdf(input);
          },
        },
        storage: new S3StorageAdapter(config),
        appUrl: config.appUrl,
      }, data),
    close: () => prisma.$disconnect(),
  };
}
