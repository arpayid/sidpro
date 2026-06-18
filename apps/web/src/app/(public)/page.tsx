import Link from 'next/link';
import {
  ArrowRight,
  FileText,
  MessageSquare,
  ShieldCheck,
  BarChart3,
} from 'lucide-react';
import { Button, Badge, Card, CardContent, CardHeader, CardTitle } from '@sidpro/ui';
import { StatCard } from '@/components/shared/stat-card';
import {
  fetchPublicVillage,
  fetchPublicStats,
  fetchPublicNews,
} from '@/lib/public-api';
import {
  demoServices,
  formatDate,
} from '@/lib/demo-data';
import { Users, Home, FileStack, AlertCircle } from 'lucide-react';

const serviceIcons = {
  'file-text': FileText,
  'message-square': MessageSquare,
  'shield-check': ShieldCheck,
  'bar-chart': BarChart3,
} as const;

const statIcons = [Users, Home, FileStack, AlertCircle];

export default async function HomePage() {
  const [village, stats, news] = await Promise.all([
    fetchPublicVillage(),
    fetchPublicStats(),
    fetchPublicNews(),
  ]);

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-700 via-emerald-600 to-emerald-800 text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-40" />
        <div className="container-page relative py-16 sm:py-24">
          <Badge className="mb-4 bg-white/20 text-white hover:bg-white/20">
            Portal Resmi Desa
          </Badge>
          <h1 className="max-w-3xl text-3xl font-bold tracking-tight sm:text-5xl">
            Selamat Datang di {village.name}
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-emerald-50">
            {village.description}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/layanan">
              <Button size="lg" className="bg-white text-emerald-700 hover:bg-emerald-50">
                Ajukan Layanan
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/profil-desa">
              <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10">
                Profil Desa
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="container-page -mt-8 relative z-10 pb-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <StatCard
              key={stat.label}
              title={stat.label}
              value={stat.value}
              change={stat.change}
              trend={stat.trend}
              icon={statIcons[index]}
            />
          ))}
        </div>
      </section>

      <section className="container-page py-12">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="section-title">Layanan Digital</h2>
            <p className="mt-2 text-slate-600">Akses layanan desa secara online dan transparan.</p>
          </div>
          <Link href="/layanan" className="hidden text-sm font-medium text-emerald-600 hover:underline sm:block">
            Lihat semua layanan
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {demoServices.map((service) => {
            const Icon = serviceIcons[service.icon as keyof typeof serviceIcons] ?? FileText;
            return (
              <Link key={service.id} href={service.href}>
                <Card className="h-full transition-shadow hover:shadow-md">
                  <CardHeader>
                    <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                      <Icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-base">{service.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-600">{service.description}</p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="bg-white py-12">
        <div className="container-page">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <h2 className="section-title">Berita Terbaru</h2>
              <p className="mt-2 text-slate-600">Informasi dan pengumuman resmi dari pemerintah desa.</p>
            </div>
            <Link href="/berita" className="text-sm font-medium text-emerald-600 hover:underline">
              Semua berita
            </Link>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {news.slice(0, 3).map((item) => (
              <Link key={item.id} href={`/berita/${item.slug}`}>
                <Card className="h-full transition-shadow hover:shadow-md">
                  <CardContent className="p-6">
                    <Badge variant="secondary" className="mb-3">
                      {item.category}
                    </Badge>
                    <h3 className="font-semibold text-slate-900">{item.title}</h3>
                    <p className="mt-2 line-clamp-2 text-sm text-slate-600">{item.excerpt}</p>
                    <p className="mt-4 text-xs text-slate-400">{formatDate(item.publishedAt)}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
