import { AsetContent } from './aset-content';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Aset',
};

export default function AsetPage() {
  return <AsetContent />;
}
