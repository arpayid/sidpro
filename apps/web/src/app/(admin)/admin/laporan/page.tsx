import type { Metadata } from 'next';
import { LaporanContent } from './laporan-content';

export const metadata: Metadata = {
  title: 'Laporan',
};

export default function LaporanPage() {
  return <LaporanContent />;
}
