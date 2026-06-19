export interface PortalService {
  id: string;
  title: string;
  description: string;
  icon: 'file-text' | 'message-square' | 'shield-check' | 'bar-chart';
  href: string;
}

/** Canonical portal layanan — bukan demo fallback. */
export const portalServices: PortalService[] = [
  {
    id: 'surat',
    title: 'Surat Online',
    description: 'Ajukan surat keterangan dan dokumen resmi desa secara online.',
    icon: 'file-text',
    href: '/layanan',
  },
  {
    id: 'pengaduan',
    title: 'Pengaduan Warga',
    description: 'Sampaikan aspirasi dan laporan masalah lingkungan desa.',
    icon: 'message-square',
    href: '/pengaduan',
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
