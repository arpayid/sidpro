import { apiFetchWithFallback } from '@/lib/api';
import { getPublicTenantCode } from '@/lib/tenant';
import {
  demoVillage,
  demoStats,
  demoNews,
  demoAgenda,
  demoGallery,
  demoTransparency,
  type VillageProfile,
  type DashboardStat,
  type NewsItem,
  type AgendaItem,
  type GalleryItem,
} from '@/lib/demo-data';

const API_PREFIX = '/api/v1';

function tenantQuery() {
  return `tenantCode=${encodeURIComponent(getPublicTenantCode())}`;
}

function formatNumber(value: number) {
  return value.toLocaleString('id-ID');
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value);
}

interface PaginatedItems<T> {
  items?: T[];
  data?: T[];
}

function extractItems<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === 'object') {
    const obj = payload as PaginatedItems<T>;
    if (Array.isArray(obj.items)) return obj.items;
    if (Array.isArray(obj.data)) return obj.data;
  }
  return [];
}

export async function fetchPublicVillage(): Promise<VillageProfile> {
  const response = await apiFetchWithFallback<{
    tenant: { name: string; code: string };
    village: {
      name: string;
      address?: string | null;
      province?: string | null;
      regency?: string | null;
      district?: string | null;
      vision?: string | null;
      mission?: string | null;
      description?: string | null;
    };
  }>(`${API_PREFIX}/village-profile?${tenantQuery()}`, {
    tenant: { name: demoVillage.name, code: demoVillage.code },
    village: demoVillage,
  });

  const village = response.village ?? (response as unknown as VillageProfile);
  const tenant = response.tenant;

  return {
    name: village.name ?? tenant?.name ?? demoVillage.name,
    code: tenant?.code ?? demoVillage.code,
    address: village.address ?? demoVillage.address,
    province: village.province ?? demoVillage.province,
    regency: village.regency ?? demoVillage.regency,
    district: village.district ?? demoVillage.district,
    vision: village.vision ?? demoVillage.vision,
    mission: village.mission ?? demoVillage.mission,
    description: village.description ?? demoVillage.description,
  };
}

export async function fetchPublicStats(): Promise<DashboardStat[]> {
  const stats = await apiFetchWithFallback<{
    residents: number;
    families: number;
    lettersThisMonth: number;
    openComplaints: number;
  }>(`${API_PREFIX}/public/stats?${tenantQuery()}`, {
    residents: 0,
    families: 0,
    lettersThisMonth: 0,
    openComplaints: 0,
  });

  if (!stats.residents && !stats.families) {
    return demoStats;
  }

  return [
    { label: 'Jumlah Penduduk', value: formatNumber(stats.residents), trend: 'neutral' },
    { label: 'Keluarga (KK)', value: formatNumber(stats.families), trend: 'neutral' },
    {
      label: 'Surat Terbit (Bulan Ini)',
      value: formatNumber(stats.lettersThisMonth),
      trend: 'neutral',
    },
    {
      label: 'Pengaduan Aktif',
      value: formatNumber(stats.openComplaints),
      trend: 'neutral',
    },
  ];
}

export async function fetchPublicNews(): Promise<NewsItem[]> {
  const payload = await apiFetchWithFallback<unknown>(
    `${API_PREFIX}/cms/posts?${tenantQuery()}&limit=12`,
    demoNews,
  );

  const items = extractItems<{
    id: string;
    slug: string;
    title: string;
    excerpt?: string | null;
    category?: string | null;
    publishedAt?: string | null;
  }>(payload);

  if (!items.length) return demoNews;

  return items.map((item) => ({
    id: item.id,
    slug: item.slug,
    title: item.title,
    excerpt: item.excerpt ?? '',
    content: item.excerpt ?? '',
    category: item.category ?? 'Umum',
    publishedAt: item.publishedAt ?? new Date().toISOString(),
    author: 'Pemerintah Desa',
  }));
}

export async function fetchPublicNewsBySlug(slug: string): Promise<NewsItem | null> {
  const post = await apiFetchWithFallback<{
    id: string;
    slug: string;
    title: string;
    excerpt?: string | null;
    content?: string | null;
    category?: string | null;
    publishedAt?: string | null;
  } | null>(`${API_PREFIX}/cms/posts/${encodeURIComponent(slug)}?${tenantQuery()}`, null);

  if (!post) {
    return demoNews.find((item) => item.slug === slug) ?? null;
  }

  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt ?? '',
    content: post.content ?? post.excerpt ?? '',
    category: post.category ?? 'Umum',
    publishedAt: post.publishedAt ?? new Date().toISOString(),
    author: 'Pemerintah Desa',
  };
}

export async function fetchPublicAgenda(): Promise<AgendaItem[]> {
  const payload = await apiFetchWithFallback<unknown>(
    `${API_PREFIX}/cms/agendas?${tenantQuery()}&limit=20`,
    demoAgenda,
  );

  const items = extractItems<{
    id: string;
    title: string;
    startAt: string;
    location?: string | null;
    description?: string | null;
  }>(payload);

  if (!items.length) return demoAgenda;

  return items.map((item) => ({
    id: item.id,
    title: item.title,
    date: item.startAt,
    location: item.location ?? '—',
    description: item.description ?? '',
  }));
}

export async function fetchPublicGallery(): Promise<GalleryItem[]> {
  const payload = await apiFetchWithFallback<unknown>(
    `${API_PREFIX}/cms/gallery?${tenantQuery()}&limit=24`,
    demoGallery,
  );

  const items = extractItems<{
    id: string;
    title: string;
    category?: string | null;
    fileId?: string | null;
  }>(payload);

  if (!items.length) return demoGallery;

  return items.map((item) => ({
    id: item.id,
    title: item.title,
    category: item.category ?? 'Umum',
    imageUrl: item.fileId
      ? `https://placehold.co/600x400/e2e8f0/64748b?text=${encodeURIComponent(item.title)}`
      : 'https://placehold.co/600x400/e2e8f0/64748b?text=Galeri',
  }));
}

export async function fetchPublicTransparency() {
  const data = await apiFetchWithFallback<{
    year: number;
    budgetYear?: {
      items: { category: string; planned: unknown; realized: unknown }[];
    } | null;
    summary: {
      totalBudget: number;
      totalPlanned: number;
      totalRealized: number;
      absorptionRate: number;
    };
    publicDocuments: { id: string; title: string }[];
  }>(`${API_PREFIX}/finance/transparency?${tenantQuery()}`, {
    year: new Date().getFullYear(),
    budgetYear: null,
    summary: { totalBudget: 0, totalPlanned: 0, totalRealized: 0, absorptionRate: 0 },
    publicDocuments: [],
  });

  const items = data.budgetYear?.items ?? [];
  if (!items.length) return demoTransparency;

  const apbd = items.map((item) => {
    const planned = Number(item.planned);
    const realized = Number(item.realized);
    const percentage =
      planned > 0 ? `${Math.round((realized / planned) * 100)}%` : '0%';
    return {
      category: item.category,
      amount: formatCurrency(realized),
      percentage,
    };
  });

  return {
    apbd,
    projects: demoTransparency.projects,
    documents: data.publicDocuments,
    summary: data.summary,
  };
}
