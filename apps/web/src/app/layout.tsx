import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { QueryProvider } from '@/providers/query-provider';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'SIDPRO — Sistem Informasi Desa',
    template: '%s | SIDPRO',
  },
  description:
    'SID Premium Enterprise — platform pemerintahan desa modern untuk layanan publik, administrasi, dan transparansi.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <body className="min-h-screen font-sans">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
