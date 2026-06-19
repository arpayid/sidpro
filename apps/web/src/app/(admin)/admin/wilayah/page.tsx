import { WilayahContent } from './wilayah-content';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Wilayah Desa',
};

export default function WilayahPage() {
  return <WilayahContent />;
}
