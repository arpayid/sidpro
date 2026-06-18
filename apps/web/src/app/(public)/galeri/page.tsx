import { Card, CardContent } from '@sidpro/ui';
import { fetchPublicGallery } from '@/lib/public-api';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Galeri',
};

export default async function GaleriPage() {
  const gallery = await fetchPublicGallery();

  return (
    <div className="container-page py-10">
      <h1 className="page-title">Galeri Desa</h1>
      <p className="page-description">Dokumentasi kegiatan dan potensi desa.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {gallery.map((item) => (
          <Card key={item.id} className="overflow-hidden">
            <div className="aspect-[4/3] overflow-hidden bg-slate-100">
              <img
                src={item.imageUrl}
                alt={item.title}
                className="h-full w-full object-cover transition-transform hover:scale-105"
              />
            </div>
            <CardContent className="p-4">
              <p className="text-xs font-medium text-emerald-600">{item.category}</p>
              <h2 className="mt-1 font-semibold text-slate-900">{item.title}</h2>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
