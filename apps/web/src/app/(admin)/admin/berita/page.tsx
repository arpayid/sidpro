import { BeritaContent } from './berita-content';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Berita CMS',
};

export default function AdminBeritaPage() {
  return <BeritaContent />;
}
