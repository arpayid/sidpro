import { GaleriContent } from './galeri-content';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Galeri CMS',
};

export default function AdminGaleriPage() {
  return <GaleriContent />;
}
