export interface VillageProfile {
  name: string;
  code: string;
  address: string;
  province: string;
  regency: string;
  district: string;
  vision: string;
  mission: string;
  description: string;
  contactPhone?: string | null;
  contactEmail?: string | null;
}

export interface DashboardStat {
  label: string;
  value: string;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
}

export interface NewsItem {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  publishedAt: string;
  author: string;
}

export interface ServiceItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  href: string;
}

export interface AgendaItem {
  id: string;
  title: string;
  date: string;
  location: string;
  description: string;
}

export interface GalleryItem {
  id: string;
  title: string;
  imageUrl: string;
  category: string;
}

export const demoVillage: VillageProfile = {
  name: 'Desa Sidpro Makmur',
  code: 'demo-desa',
  address: 'Jl. Merdeka No. 1, Desa Sidpro Makmur',
  province: 'Jawa Tengah',
  regency: 'Kabupaten Demo',
  district: 'Kecamatan Contoh',
  vision: 'Desa mandiri, sejahtera, dan berkelanjutan melalui tata kelola digital.',
  mission:
    'Meningkatkan pelayanan publik, transparansi pemerintahan, dan kesejahteraan warga melalui sistem informasi desa terintegrasi.',
  description:
    'Desa Sidpro Makmur adalah desa percontohan implementasi SID Premium Enterprise dengan layanan digital terpadu untuk warga dan pemerintah desa.',
};

export const demoStats: DashboardStat[] = [
  { label: 'Jumlah Penduduk', value: '4.832', change: '+1.2%', trend: 'up' },
  { label: 'Keluarga (KK)', value: '1.245', change: '+0.8%', trend: 'up' },
  { label: 'Surat Terbit (Bulan Ini)', value: '186', change: '+12%', trend: 'up' },
  { label: 'Pengaduan Aktif', value: '23', change: '-5%', trend: 'down' },
];

export const demoNews: NewsItem[] = [
  {
    id: '1',
    slug: 'peluncuran-portal-desa-digital',
    title: 'Peluncuran Portal Desa Digital SIDPRO',
    excerpt:
      'Pemerintah desa resmi meluncurkan portal layanan digital untuk mempercepat administrasi warga.',
    content:
      'Pemerintah Desa Sidpro Makmur secara resmi meluncurkan portal layanan digital SIDPRO. Platform ini memungkinkan warga mengajukan surat, melihat berita, dan mengakses informasi transparansi secara online.\n\nDengan sistem ini, waktu pengurusan surat diharapkan berkurang hingga 50% dibandingkan proses manual.',
    category: 'Pengumuman',
    publishedAt: '2026-06-10',
    author: 'Admin Desa',
  },
  {
    id: '2',
    slug: 'program-bantuan-pangan-tahap-2',
    title: 'Program Bantuan Pangan Tahap 2 Dibuka',
    excerpt: 'Pendaftaran bantuan pangan tahap kedua dibuka mulai 15 Juni 2026.',
    content:
      'Desa membuka pendaftaran program bantuan pangan tahap kedua untuk keluarga kurang mampu. Syarat dan ketentuan dapat diperoleh di kantor desa atau melalui layanan online.',
    category: 'Bantuan Sosial',
    publishedAt: '2026-06-08',
    author: 'Sekretaris Desa',
  },
  {
    id: '3',
    slug: 'gotong-royong-bersih-desa',
    title: 'Gotong Royong Bersih Desa Minggu Depan',
    excerpt: 'Seluruh warga diundang untuk berpartisipasi dalam kegiatan bersih desa.',
    content:
      'Kegiatan gotong royong bersih desa akan dilaksanakan pada hari Minggu, 22 Juni 2026 pukul 07.00 WIB. Titik kumpul di Balai Desa.',
    category: 'Kegiatan',
    publishedAt: '2026-06-05',
    author: 'Karang Taruna',
  },
];

export const demoServices: ServiceItem[] = [
  {
    id: '1',
    title: 'Surat Online',
    description: 'Ajukan surat keterangan dan dokumen resmi desa secara online.',
    icon: 'file-text',
    href: '/layanan',
  },
  {
    id: '2',
    title: 'Pengaduan Warga',
    description: 'Sampaikan aspirasi dan laporan masalah lingkungan desa.',
    icon: 'message-square',
    href: '/pengaduan',
  },
  {
    id: '3',
    title: 'Verifikasi Surat',
    description: 'Periksa keaslian surat desa menggunakan kode QR.',
    icon: 'shield-check',
    href: '/verifikasi-surat',
  },
  {
    id: '4',
    title: 'Transparansi',
    description: 'Akses laporan keuangan dan pembangunan desa secara terbuka.',
    icon: 'bar-chart',
    href: '/transparansi',
  },
];

export const demoAgenda: AgendaItem[] = [
  {
    id: '1',
    title: 'Rapat Koordinasi BPD',
    date: '2026-06-20T09:00:00',
    location: 'Balai Desa',
    description: 'Rapat koordinasi Badan Permusyawaratan Desa perihal RKPDes.',
  },
  {
    id: '2',
    title: 'Posyandu Balita',
    date: '2026-06-22T08:00:00',
    location: 'Posyandu Melati',
    description: 'Pemeriksaan kesehatan balita dan imunisasi rutin.',
  },
  {
    id: '3',
    title: 'Gotong Royong Bersih Desa',
    date: '2026-06-22T07:00:00',
    location: 'Seluruh Wilayah Desa',
    description: 'Kegiatan bersih-bersih lingkungan bersama warga.',
  },
];

export const demoGallery: GalleryItem[] = [
  {
    id: '1',
    title: 'Balai Desa Sidpro',
    imageUrl: 'https://picsum.photos/seed/sidpro1/800/600',
    category: 'Infrastruktur',
  },
  {
    id: '2',
    title: 'Gotong Royong Warga',
    imageUrl: 'https://picsum.photos/seed/sidpro2/800/600',
    category: 'Kegiatan',
  },
  {
    id: '3',
    title: 'Pasar Desa',
    imageUrl: 'https://picsum.photos/seed/sidpro3/800/600',
    category: 'Ekonomi',
  },
  {
    id: '4',
    title: 'Sawah Subur',
    imageUrl: 'https://picsum.photos/seed/sidpro4/800/600',
    category: 'Pertanian',
  },
];

export const demoTransparency = {
  apbd: [
    { category: 'Pendapatan', amount: 'Rp 2.450.000.000', percentage: '100%' },
    { category: 'Belanja', amount: 'Rp 2.180.000.000', percentage: '89%' },
    { category: 'Pembiayaan', amount: 'Rp 270.000.000', percentage: '11%' },
  ],
  projects: [
    { name: 'Jalan Desa Tahap 1', budget: 'Rp 450.000.000', progress: 85 },
    { name: 'Renovasi Balai Desa', budget: 'Rp 280.000.000', progress: 60 },
    { name: 'Drainase RT 03', budget: 'Rp 120.000.000', progress: 40 },
  ],
};

export const adminNavItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: 'layout-dashboard' },
  { href: '/admin/penduduk', label: 'Penduduk', icon: 'users' },
  { href: '/admin/keluarga', label: 'Keluarga', icon: 'home' },
  { href: '/admin/surat', label: 'Surat', icon: 'file-text' },
  { href: '/admin/pengaduan', label: 'Pengaduan', icon: 'message-square' },
  { href: '/admin/bantuan-sosial', label: 'Bantuan Sosial', icon: 'heart-handshake' },
  { href: '/admin/aset', label: 'Aset', icon: 'building' },
  { href: '/admin/pembangunan', label: 'Pembangunan', icon: 'hard-hat' },
  { href: '/admin/keuangan', label: 'Keuangan', icon: 'wallet' },
  { href: '/admin/berita', label: 'Berita', icon: 'newspaper' },
  { href: '/admin/laporan', label: 'Laporan', icon: 'file-bar-chart' },
  { href: '/admin/pengaturan', label: 'Pengaturan', icon: 'settings' },
  { href: '/admin/users', label: 'Pengguna', icon: 'user-cog' },
  { href: '/admin/audit-logs', label: 'Audit Log', icon: 'scroll-text' },
] as const;

export { publicNavItems } from './portal-navigation';

export function getNewsBySlug(slug: string): NewsItem | undefined {
  return demoNews.find((item) => item.slug === slug);
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
