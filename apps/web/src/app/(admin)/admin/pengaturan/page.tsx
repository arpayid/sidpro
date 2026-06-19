import type { Metadata } from 'next';
import { PengaturanContent } from './pengaturan-content';

export const metadata: Metadata = {
  title: 'Pengaturan',
};

export default function PengaturanPage() {
  return <PengaturanContent />;
}
