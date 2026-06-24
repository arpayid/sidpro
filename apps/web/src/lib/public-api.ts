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

const DEMO_FALLBACK_ENABLED =
  process.env.NEXT_PUBLIC_ENABLE_DEMO_FALLBACK === 'true' ||
  (process.env.NODE_ENV !== 'production' &&
    process.env.NEXT_PUBLIC_ENABLE_DEMO_FALLBACK !== 'false');

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
    contact?: { phone?: string | null; email?: string | null };
    officials?: { name: string; title: string }[];
  }>(
    `${API_PREFIX}/village-profile?${tenantQuery()}`,
    DEMO_FALLBACK_ENABLED
      ? {
          tenant: { name: demoVillage.name, code: demoVillage.code },
          village: demoVillage,
          contact: { phone: null, email: null },
          officials: [{ name: 'Kepala Desa Demo', title: 'Kepala Desa' }],
        }
      : {
          tenant: { name: '', code: getPublicTenantCode() },
          village: { name: '' },
          contact: { phone: null, email: null },
          officials: [],
        },
  );

  const village = response.village ?? (response as unknown as VillageProfile);
  const tenant = response.tenant;
  const contact = response.contact;

  return {
    name: village.name ?? tenant?.name ?? (DEMO_FALLBACK_ENABLED ? demoVillage.name : ''),
    code: tenant?.code ?? (DEMO_FALLBACK_ENABLED ? demoVillage.code : getPublicTenantCode()),
    address: village.address ?? (DEMO_FALLBACK_ENABLED ? demoVillage.address : ''),
    province: village.province ?? (DEMO_FALLBACK_ENABLED ? demoVillage.province : ''),
    regency: village.regency ?? (DEMO_FALLBACK_ENABLED ? demoVillage.regency : ''),
    district: village.district ?? (DEMO_FALLBACK_ENABLED ? demoVillage.district : ''),
    vision: village.vision ?? (DEMO_FALLBACK_ENABLED ? demoVillage.vision : ''),
    mission: village.mission ?? (DEMO_FALLBACK_ENABLED ? demoVillage.mission : ''),
    description: village.description ?? (DEMO_FALLBACK_ENABLED ? demoVillage.description : ''),
    contactPhone: contact?.phone ?? null,
    contactEmail: contact?.email ?? null,
    officials: response.officials ?? [],
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
    return DEMO_FALLBACK_ENABLED ? demoStats : [];
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
    DEMO_FALLBACK_ENABLED ? demoNews : [],
  );

  const items = extractItems<{
    id: string;
    slug: string;
    title: string;
    excerpt?: string | null;
    category?: string | null;
    publishedAt?: string | null;
  }>(payload);

  if (!items.length) return DEMO_FALLBACK_ENABLED ? demoNews : [];

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
    return DEMO_FALLBACK_ENABLED ? (demoNews.find((item) => item.slug === slug) ?? null) : null;
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
    DEMO_FALLBACK_ENABLED ? demoAgenda : [],
  );

  const items = extractItems<{
    id: string;
    title: string;
    startAt: string;
    location?: string | null;
    description?: string | null;
  }>(payload);

  if (!items.length) return DEMO_FALLBACK_ENABLED ? demoAgenda : [];

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
    DEMO_FALLBACK_ENABLED ? demoGallery : [],
  );

  const items = extractItems<{
    id: string;
    title: string;
    category?: string | null;
    fileId?: string | null;
    imageUrl?: string | null;
  }>(payload);

  if (!items.length) return DEMO_FALLBACK_ENABLED ? demoGallery : [];

  return items.map((item) => ({
    id: item.id,
    title: item.title,
    category: item.category ?? 'Umum',
    imageUrl:
      item.imageUrl ??
      `https://placehold.co/600x400/e2e8f0/64748b?text=${encodeURIComponent(item.title)}`,
  }));
}

export async function fetchPublicTransparency() {
  const tenantQueryStr = tenantQuery();
  const [data, projectsPayload] = await Promise.all([
    apiFetchWithFallback<{
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
    }>(`${API_PREFIX}/finance/transparency?${tenantQueryStr}`, {
      year: new Date().getFullYear(),
      budgetYear: null,
      summary: { totalBudget: 0, totalPlanned: 0, totalRealized: 0, absorptionRate: 0 },
      publicDocuments: [],
    }),
    apiFetchWithFallback<{
      id: string;
      name: string;
      budget: number | null;
      progress: number;
      status: string;
      location?: string | null;
    }[]>(`${API_PREFIX}/development/public/projects?${tenantQueryStr}&limit=20`, []),
  ]);

  const items = data.budgetYear?.items ?? [];
  const projectItems = Array.isArray(projectsPayload) ? projectsPayload : [];

  const apbd = items.length
    ? items.map((item) => {
        const planned = Number(item.planned);
        const realized = Number(item.realized);
        const percentage =
          planned > 0 ? `${Math.round((realized / planned) * 100)}%` : '0%';
        return {
          category: item.category,
          amount: formatCurrency(realized),
          percentage,
        };
      })
    : DEMO_FALLBACK_ENABLED
      ? demoTransparency.apbd
      : [];

  const projects = projectItems.length
    ? projectItems.map((project) => ({
        name: project.name,
        budget: project.budget ? formatCurrency(project.budget) : '—',
        progress: project.progress,
      }))
    : DEMO_FALLBACK_ENABLED
      ? demoTransparency.projects
      : [];

  if (!items.length && !projectItems.length) {
    return DEMO_FALLBACK_ENABLED
      ? { ...demoTransparency, documents: data.publicDocuments ?? [] }
      : { apbd: [], projects: [], documents: data.publicDocuments ?? [], summary: data.summary };
  }

  return {
    apbd,
    projects,
    documents: data.publicDocuments,
    summary: data.summary,
  };
}
