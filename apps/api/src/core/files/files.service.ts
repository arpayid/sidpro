import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash, randomUUID } from 'crypto';
import { createFileMetadataSchema, updateFileMetadataSchema, uploadFileMetadataSchema } from '@sidpro/validators';
import { parseWithZod } from '../../common/utils/zod-validation.util';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { StorageService } from '../storage/storage.service';
import { JwtPayload } from '../../common/decorators/current-user.decorator';
import { paginatedResponse, successResponse } from '../../common/utils/response.util';
import { assertMimeMatchesBuffer } from '../../common/utils/file-mime.util';

const CMS_GALLERY_OWNER = 'gallery';
const BROAD_FILE_PERMISSIONS = [
  'settings.manage',
  'complaints.create',
  'complaints.update',
  'complaints.read',
  'letters.create',
  'letters.download',
  'population.import',
] as const;

@Injectable()
export class FilesService {
  constructor(
    private prisma: PrismaService,
    private auditLogs: AuditLogsService,
    private storage: StorageService,
  ) {}

  private requireTenant(user: JwtPayload): string {
    if (!user.tenantId) throw new ForbiddenException('Tenant scope required');
    return user.tenantId;
  }

  private hasBroadFileAccess(user: JwtPayload): boolean {
    return (
      user.roles.includes('superadmin_system') ||
      user.permissions.includes('settings.manage')
    );
  }

  private isCmsScopedUser(user: JwtPayload): boolean {
    const hasCms =
      user.permissions.includes('cms.read') || user.permissions.includes('cms.manage');
    const hasOtherFileAccess = BROAD_FILE_PERMISSIONS.some((permission) =>
      user.permissions.includes(permission),
    );
    return hasCms && !hasOtherFileAccess && !user.roles.includes('superadmin_system');
  }

  private assertUploadOwnerType(user: JwtPayload, ownerType: string) {
    if (this.isCmsScopedUser(user) && ownerType !== CMS_GALLERY_OWNER) {
      throw new ForbiddenException('Upload CMS hanya diizinkan untuk galeri');
    }
  }

  private assertDownloadOwnerType(user: JwtPayload, ownerType: string) {
    if (this.isCmsScopedUser(user) && ownerType !== CMS_GALLERY_OWNER) {
      throw new ForbiddenException('Unduhan CMS hanya diizinkan untuk file galeri');
    }
  }

  private isReferencedFileDeleteError(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003';
  }

  private async purgeStalePublicComplaintFiles(tenantId: string, maxAgeHours = 24) {
    const cutoff = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
    const stale = await this.prisma.file.findMany({
      where: {
        tenantId,
        ownerType: 'complaint_public',
        ownerId: null,
        createdAt: { lt: cutoff },
      },
    });

    for (const file of stale) {
      try {
        await this.storage.deleteFile(file.path);
      } catch {
        // ignore storage cleanup errors for stale orphans
      }
      await this.prisma.file.delete({ where: { id: file.id } });
    }
  }

  async findAll(
    user: JwtPayload,
    page = 1,
    limit = 20,
    ownerType?: string,
    ownerId?: string,
  ) {
    const tenantId = this.requireTenant(user);
    const where = {
      tenantId,
      ...(ownerType ? { ownerType } : {}),
      ...(ownerId ? { ownerId } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.file.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.file.count({ where }),
    ]);

    return paginatedResponse(data, page, limit, total);
  }

  async findOne(user: JwtPayload, id: string) {
    const tenantId = this.requireTenant(user);
    const file = await this.prisma.file.findFirst({ where: { id, tenantId } });
    if (!file) throw new NotFoundException('File tidak ditemukan');
    return successResponse(file);
  }

  async upload(
    user: JwtPayload,
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
    body: { ownerType?: string; ownerId?: string },
    ipAddress?: string,
  ) {
    const tenantId = this.requireTenant(user);
    const parsedBody = parseWithZod(uploadFileMetadataSchema, body);
    const ownerType = parsedBody.ownerType ?? 'upload';
    this.assertUploadOwnerType(user, ownerType);
    assertMimeMatchesBuffer(file.mimetype, file.buffer);
    const key = `${tenantId}/${ownerType}/${randomUUID()}-${file.originalname}`;
    const checksum = createHash('sha256').update(file.buffer).digest('hex');

    await this.storage.uploadFile(file.buffer, key, file.mimetype);

    const record = await this.prisma.file.create({
      data: {
        tenantId,
        ownerType,
        ownerId: parsedBody.ownerId,
        path: key,
        mimeType: file.mimetype,
        size: file.size,
        checksum,
      },
    });

    await this.auditLogs.log({
      tenantId,
      actorId: user.sub,
      action: 'upload',
      module: 'files',
      entityType: 'file',
      entityId: record.id,
      metadata: { path: key, mimeType: file.mimetype, size: file.size },
      ipAddress,
    });

    return successResponse(record, 'File berhasil diunggah');
  }

  async uploadPublic(
    tenantId: string,
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
    ipAddress?: string,
  ) {
    assertMimeMatchesBuffer(file.mimetype, file.buffer);
    await this.purgeStalePublicComplaintFiles(tenantId);

    const key = `${tenantId}/complaint_public/${randomUUID()}-${file.originalname}`;
    const checksum = createHash('sha256').update(file.buffer).digest('hex');

    await this.storage.uploadFile(file.buffer, key, file.mimetype);

    const record = await this.prisma.file.create({
      data: {
        tenantId,
        ownerType: 'complaint_public',
        ownerId: null,
        path: key,
        mimeType: file.mimetype,
        size: file.size,
        checksum,
      },
    });

    await this.auditLogs.log({
      tenantId,
      action: 'upload',
      module: 'files',
      entityType: 'file',
      entityId: record.id,
      metadata: { path: key, mimeType: file.mimetype, size: file.size, public: true },
      ipAddress,
    });

    return successResponse(record, 'File berhasil diunggah');
  }

  async linkPublicComplaintFiles(tenantId: string, complaintId: string, fileIds: string[]) {
    if (!fileIds.length) return;

    const files = await this.prisma.file.findMany({
      where: {
        id: { in: fileIds },
        tenantId,
        ownerType: 'complaint_public',
        ownerId: null,
      },
    });

    if (files.length !== fileIds.length) {
      throw new BadRequestException('Lampiran tidak valid atau sudah digunakan');
    }

    await this.prisma.file.updateMany({
      where: { id: { in: fileIds } },
      data: { ownerType: 'complaint', ownerId: complaintId },
    });
  }

  async getDownloadUrl(user: JwtPayload, id: string) {
    const tenantId = this.requireTenant(user);
    const file = await this.prisma.file.findFirst({ where: { id, tenantId } });
    if (!file) throw new NotFoundException('File tidak ditemukan');
    this.assertDownloadOwnerType(user, file.ownerType);

    const url = await this.storage.getSignedUrl(file.path);
    return successResponse({ url, expiresIn: 3600 });
  }

  async create(
    user: JwtPayload,
    body: {
      ownerType: string;
      ownerId?: string;
      path: string;
      mimeType: string;
      size: number;
      checksum?: string;
    },
    ipAddress?: string,
  ) {
    const tenantId = this.requireTenant(user);
    const parsed = parseWithZod(createFileMetadataSchema, body);
    const file = await this.prisma.file.create({
      data: { tenantId, ...parsed },
    });

    await this.auditLogs.log({
      tenantId,
      actorId: user.sub,
      action: 'create',
      module: 'files',
      entityType: 'file',
      entityId: file.id,
      ipAddress,
    });

    return successResponse(file, 'Metadata file berhasil dibuat');
  }

  async update(
    user: JwtPayload,
    id: string,
    body: { ownerType?: string; ownerId?: string; path?: string },
    ipAddress?: string,
  ) {
    const tenantId = this.requireTenant(user);
    const parsed = parseWithZod(updateFileMetadataSchema, body);
    const existing = await this.prisma.file.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('File tidak ditemukan');

    const file = await this.prisma.file.update({ where: { id }, data: parsed });

    await this.auditLogs.log({
      tenantId,
      actorId: user.sub,
      action: 'update',
      module: 'files',
      entityType: 'file',
      entityId: id,
      ipAddress,
    });

    return successResponse(file, 'Metadata file berhasil diperbarui');
  }

  async remove(user: JwtPayload, id: string, ipAddress?: string) {
    const tenantId = this.requireTenant(user);
    const existing = await this.prisma.file.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('File tidak ditemukan');

    let deleted;
    try {
      deleted = await this.prisma.file.delete({ where: { id } });
    } catch (error) {
      if (this.isReferencedFileDeleteError(error)) {
        throw new ConflictException('File masih digunakan oleh data aplikasi dan tidak dapat dihapus');
      }
      throw error;
    }

    try {
      await this.storage.deleteFile(deleted.path);
    } catch {
      await this.auditLogs.log({
        tenantId,
        actorId: user.sub,
        action: 'storage_cleanup_required',
        module: 'files',
        entityType: 'file',
        entityId: id,
        metadata: { reason: 'delete_after_metadata_removal' },
        ipAddress,
      });
      return successResponse(
        { storageCleanupRequired: true },
        'Metadata file dihapus, tetapi pembersihan object storage perlu ditindaklanjuti',
      );
    }

    await this.auditLogs.log({
      tenantId,
      actorId: user.sub,
      action: 'delete',
      module: 'files',
      entityType: 'file',
      entityId: id,
      ipAddress,
    });

    return successResponse(null, 'File berhasil dihapus');
  }
}
