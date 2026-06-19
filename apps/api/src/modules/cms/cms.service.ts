import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogsService } from '../../core/audit-logs/audit-logs.service';
import { StorageService } from '../../core/storage/storage.service';
import { JwtPayload } from '../../common/decorators/current-user.decorator';
import { paginatedResponse, successResponse } from '../../common/utils/response.util';

@Injectable()
export class CmsService {
  constructor(
    private prisma: PrismaService,
    private auditLogs: AuditLogsService,
    private storage: StorageService,
  ) {}

  private async resolveTenantId(tenantCode: string): Promise<string> {
    const tenant = await this.prisma.tenant.findUnique({ where: { code: tenantCode } });
    if (!tenant) throw new NotFoundException('Tenant tidak ditemukan');
    return tenant.id;
  }

  private requireTenant(user: JwtPayload): string {
    if (!user.tenantId) throw new ForbiddenException('Tenant scope required');
    return user.tenantId;
  }

  // ─── Posts ──────────────────────────────────────────────────────────────────

  async findPublicPosts(tenantCode: string, page = 1, limit = 10) {
    const tenantId = await this.resolveTenantId(tenantCode);
    const where = { tenantId, status: 'published' };
    const [data, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { publishedAt: 'desc' },
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          category: true,
          publishedAt: true,
        },
      }),
      this.prisma.post.count({ where }),
    ]);
    return paginatedResponse(data, page, limit, total);
  }

  async findPublicPostBySlug(tenantCode: string, slug: string) {
    const tenantId = await this.resolveTenantId(tenantCode);
    const post = await this.prisma.post.findFirst({
      where: { tenantId, slug, status: 'published' },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        content: true,
        category: true,
        publishedAt: true,
      },
    });
    if (!post) throw new NotFoundException('Berita tidak ditemukan');
    return successResponse(post);
  }

  async findPosts(user: JwtPayload, page = 1, limit = 20, status?: string) {
    const tenantId = this.requireTenant(user);
    const where = { tenantId, ...(status ? { status } : {}) };
    const [data, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.post.count({ where }),
    ]);
    return paginatedResponse(data, page, limit, total);
  }

  async createPost(
    user: JwtPayload,
    body: {
      title: string;
      slug: string;
      content: string;
      excerpt?: string;
      category?: string;
      status?: string;
    },
    ipAddress?: string,
  ) {
    const tenantId = this.requireTenant(user);
    const post = await this.prisma.post.create({
      data: {
        tenantId,
        ...body,
        publishedAt: body.status === 'published' ? new Date() : null,
      },
    });
    await this.auditLogs.log({
      tenantId,
      actorId: user.sub,
      action: 'create',
      module: 'cms',
      entityType: 'post',
      entityId: post.id,
      ipAddress,
    });
    return successResponse(post, 'Berita berhasil dibuat');
  }

  async updatePost(user: JwtPayload, id: string, body: Record<string, unknown>, ipAddress?: string) {
    const tenantId = this.requireTenant(user);
    const existing = await this.prisma.post.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Berita tidak ditemukan');

    const data = { ...body };
    if (data.status === 'published' && !existing.publishedAt) {
      data.publishedAt = new Date();
    }

    const post = await this.prisma.post.update({ where: { id }, data });
    await this.auditLogs.log({
      tenantId,
      actorId: user.sub,
      action: 'update',
      module: 'cms',
      entityType: 'post',
      entityId: id,
      ipAddress,
    });
    return successResponse(post, 'Berita berhasil diperbarui');
  }

  async removePost(user: JwtPayload, id: string, ipAddress?: string) {
    const tenantId = this.requireTenant(user);
    const existing = await this.prisma.post.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Berita tidak ditemukan');

    await this.prisma.post.delete({ where: { id } });
    await this.auditLogs.log({
      tenantId,
      actorId: user.sub,
      action: 'delete',
      module: 'cms',
      entityType: 'post',
      entityId: id,
      ipAddress,
    });
    return successResponse(null, 'Berita berhasil dihapus');
  }

  // ─── Agendas ────────────────────────────────────────────────────────────────

  async findPublicAgendas(tenantCode: string, page = 1, limit = 10) {
    const tenantId = await this.resolveTenantId(tenantCode);
    const where = { tenantId, status: 'scheduled' };
    const [data, total] = await Promise.all([
      this.prisma.agenda.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { startAt: 'asc' },
      }),
      this.prisma.agenda.count({ where }),
    ]);
    return paginatedResponse(data, page, limit, total);
  }

  async findAgendas(user: JwtPayload, page = 1, limit = 20) {
    const tenantId = this.requireTenant(user);
    const where = { tenantId };
    const [data, total] = await Promise.all([
      this.prisma.agenda.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { startAt: 'desc' },
      }),
      this.prisma.agenda.count({ where }),
    ]);
    return paginatedResponse(data, page, limit, total);
  }

  async createAgenda(
    user: JwtPayload,
    body: {
      title: string;
      description?: string;
      location?: string;
      startAt: string;
      endAt?: string;
      status?: string;
    },
    ipAddress?: string,
  ) {
    const tenantId = this.requireTenant(user);
    const agenda = await this.prisma.agenda.create({
      data: {
        tenantId,
        title: body.title,
        description: body.description,
        location: body.location,
        startAt: new Date(body.startAt),
        endAt: body.endAt ? new Date(body.endAt) : null,
        status: body.status ?? 'scheduled',
      },
    });
    await this.auditLogs.log({
      tenantId,
      actorId: user.sub,
      action: 'create',
      module: 'cms',
      entityType: 'agenda',
      entityId: agenda.id,
      ipAddress,
    });
    return successResponse(agenda, 'Agenda berhasil dibuat');
  }

  async updateAgenda(user: JwtPayload, id: string, body: Record<string, unknown>, ipAddress?: string) {
    const tenantId = this.requireTenant(user);
    const existing = await this.prisma.agenda.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Agenda tidak ditemukan');

    const data = { ...body };
    if (typeof data.startAt === 'string') data.startAt = new Date(data.startAt);
    if (typeof data.endAt === 'string') data.endAt = new Date(data.endAt);

    const agenda = await this.prisma.agenda.update({ where: { id }, data });
    await this.auditLogs.log({
      tenantId,
      actorId: user.sub,
      action: 'update',
      module: 'cms',
      entityType: 'agenda',
      entityId: id,
      ipAddress,
    });
    return successResponse(agenda, 'Agenda berhasil diperbarui');
  }

  async removeAgenda(user: JwtPayload, id: string, ipAddress?: string) {
    const tenantId = this.requireTenant(user);
    const existing = await this.prisma.agenda.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Agenda tidak ditemukan');

    await this.prisma.agenda.delete({ where: { id } });
    await this.auditLogs.log({
      tenantId,
      actorId: user.sub,
      action: 'delete',
      module: 'cms',
      entityType: 'agenda',
      entityId: id,
      ipAddress,
    });
    return successResponse(null, 'Agenda berhasil dihapus');
  }

  // ─── Gallery ────────────────────────────────────────────────────────────────

  async findPublicGallery(tenantCode: string, page = 1, limit = 20) {
    const tenantId = await this.resolveTenantId(tenantCode);
    const where = { tenantId };
    const [data, total] = await Promise.all([
      this.prisma.galleryItem.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.galleryItem.count({ where }),
    ]);

    const enriched = await this.enrichGalleryItemsWithImageUrls(tenantId, data);
    return paginatedResponse(enriched, page, limit, total);
  }

  private async enrichGalleryItemsWithImageUrls<
    T extends { fileId?: string | null; title: string },
  >(tenantId: string, items: T[]) {
    const fileIds = items
      .map((item) => item.fileId)
      .filter((fileId): fileId is string => Boolean(fileId));

    const files = fileIds.length
      ? await this.prisma.file.findMany({
          where: { id: { in: fileIds }, tenantId },
          select: { id: true, path: true },
        })
      : [];
    const pathById = new Map(files.map((file) => [file.id, file.path]));

    return Promise.all(
      items.map(async (item) => {
        if (!item.fileId) {
          return { ...item, imageUrl: null };
        }

        const path = pathById.get(item.fileId);
        if (!path) {
          return { ...item, imageUrl: null };
        }

        const imageUrl = await this.storage.getSignedUrl(path);
        return { ...item, imageUrl };
      }),
    );
  }

  async findGallery(user: JwtPayload, page = 1, limit = 20) {
    const tenantId = this.requireTenant(user);
    const where = { tenantId };
    const [data, total] = await Promise.all([
      this.prisma.galleryItem.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.galleryItem.count({ where }),
    ]);
    return paginatedResponse(data, page, limit, total);
  }

  async createGalleryItem(
    user: JwtPayload,
    body: { title: string; description?: string; fileId?: string; type?: string },
    ipAddress?: string,
  ) {
    const tenantId = this.requireTenant(user);
    const item = await this.prisma.galleryItem.create({
      data: { tenantId, ...body },
    });
    await this.auditLogs.log({
      tenantId,
      actorId: user.sub,
      action: 'create',
      module: 'cms',
      entityType: 'gallery_item',
      entityId: item.id,
      ipAddress,
    });
    return successResponse(item, 'Item galeri berhasil ditambahkan');
  }

  async removeGalleryItem(user: JwtPayload, id: string, ipAddress?: string) {
    const tenantId = this.requireTenant(user);
    const existing = await this.prisma.galleryItem.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Item galeri tidak ditemukan');

    await this.prisma.galleryItem.delete({ where: { id } });
    await this.auditLogs.log({
      tenantId,
      actorId: user.sub,
      action: 'delete',
      module: 'cms',
      entityType: 'gallery_item',
      entityId: id,
      ipAddress,
    });
    return successResponse(null, 'Item galeri berhasil dihapus');
  }
}
