export const publicNavItems = [
  { href: '/', label: 'Beranda' },
  { href: '/profil-desa', label: 'Profil Desa' },
  { href: '/berita', label: 'Berita' },
  { href: '/agenda', label: 'Agenda' },
  { href: '/galeri', label: 'Galeri' },
  { href: '/layanan', label: 'Layanan' },
  { href: '/transparansi', label: 'Transparansi' },
  { href: '/pengaduan', label: 'Pengaduan' },
  { href: '/surat/cek', label: 'Cek Surat' },
  { href: '/verifikasi-surat', label: 'Verifikasi Surat' },
] as const;

export type PublicNavItem = (typeof publicNavItems)[number];
