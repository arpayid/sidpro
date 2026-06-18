import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge, Button } from '@sidpro/ui';
import { apiFetchWithFallback } from '@/lib/api';
import { demoNews, formatDate, getNewsBySlug, type NewsItem } from '@/lib/demo-data';
import type { Metadata } from 'next';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = getNewsBySlug(slug);
  return { title: article?.title ?? 'Berita' };
}

export default async function BeritaDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const news = await apiFetchWithFallback<NewsItem[]>('/api/v1/public/news', demoNews);
  const article = news.find((item) => item.slug === slug) ?? getNewsBySlug(slug);

  if (!article) {
    notFound();
  }

  return (
    <article className="container-page py-10">
      <Link href="/berita">
        <Button variant="ghost" size="sm" className="mb-4">
          ← Kembali ke Berita
        </Button>
      </Link>

      <Badge variant="secondary" className="mb-4">
        {article.category}
      </Badge>
      <h1 className="page-title">{article.title}</h1>
      <p className="mt-2 text-sm text-slate-500">
        {formatDate(article.publishedAt)} · {article.author}
      </p>

      <div className="prose prose-slate mt-8 max-w-none">
        {article.content.split('\n\n').map((paragraph) => (
          <p key={paragraph.slice(0, 40)} className="mb-4 text-slate-700 leading-relaxed">
            {paragraph}
          </p>
        ))}
      </div>
    </article>
  );
}
