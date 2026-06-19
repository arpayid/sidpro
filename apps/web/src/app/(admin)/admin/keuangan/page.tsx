import { KeuanganContent } from './keuangan-content';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Keuangan',
};

export default function KeuanganPage() {
  return <KeuanganContent />;
}
