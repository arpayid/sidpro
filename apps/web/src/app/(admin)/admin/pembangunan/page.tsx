import { PembangunanContent } from './pembangunan-content';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pembangunan',
};

export default function PembangunanPage() {
  return <PembangunanContent />;
}
