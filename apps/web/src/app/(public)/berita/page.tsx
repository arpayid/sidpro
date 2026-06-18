import Link from 'next/link';
import { Badge, Card, CardContent } from '@sidpro/ui';
import { fetchPublicNews } from '@/lib/public-api';
import { formatDate } from '@/lib/demo-data';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Berita',
};

export default async function BeritaPage() {
  const news = await fetchPublicNews();

  return (
    <div className="container-page py-10">
      <h1 className="page-title">Berita Desa</h1>
      <p className="page-description">Pengumuman, kegiatan, dan informasi terbaru dari desa.</p>

      <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {news.map((item) => (
          <Link key={item.id} href={`/berita/${item.slug}`}>
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardContent className="p-6">
                <Badge variant="secondary" className="mb-3">
                  {item.category}
                </Badge>
                <h2 className="text-lg font-semibold text-slate-900">{item.title}</h2>
                <p className="mt-2 line-clamp-3 text-sm text-slate-600">{item.excerpt}</p>
                <p className="mt-4 text-xs text-slate-400">
                  {formatDate(item.publishedAt)} · {item.author}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
