export interface PortalService {
  id: string;
  title: string;
  description: string;
  icon: 'file-text' | 'message-square' | 'shield-check' | 'bar-chart' | 'search';
  href: string;
}

/** Canonical portal layanan — bukan demo fallback. */
export const portalServices: PortalService[] = [
  {
    id: 'pengaduan',
    title: 'Pengaduan Warga',
    description: 'Sampaikan aspirasi dan laporan masalah lingkungan desa.',
    icon: 'message-square',
    href: '/pengaduan',
  },
  {
    id: 'cek-pengaduan',
    title: 'Cek Status Pengaduan',
    description: 'Lacak progres pengaduan dengan nomor tiket dan nomor HP.',
    icon: 'search',
    href: '/pengaduan/cek',
  },
  {
    id: 'cek-surat',
    title: 'Cek Status Surat',
    description: 'Lacak permohonan surat dengan nomor tiket dan 4 digit terakhir NIK.',
    icon: 'search',
    href: '/surat/cek',
  },
  {
    id: 'verifikasi',
    title: 'Verifikasi Surat',
    description: 'Periksa keaslian surat desa menggunakan kode QR.',
    icon: 'shield-check',
    href: '/verifikasi-surat',
  },
  {
    id: 'transparansi',
    title: 'Transparansi',
    description: 'Akses laporan keuangan dan pembangunan desa secara terbuka.',
    icon: 'bar-chart',
    href: '/transparansi',
  },
];
