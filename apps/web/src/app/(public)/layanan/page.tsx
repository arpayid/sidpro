import Link from 'next/link';
import {
  FileText,
  MessageSquare,
  ShieldCheck,
  BarChart3,
  Search,
  ArrowRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@sidpro/ui';
import { portalServices } from '@/lib/portal-services';
import type { Metadata } from 'next';

const icons = {
  'file-text': FileText,
  'message-square': MessageSquare,
  'shield-check': ShieldCheck,
  'bar-chart': BarChart3,
  search: Search,
} as const;

export const metadata: Metadata = {
  title: 'Layanan',
};

export default function LayananPage() {
  return (
    <div className="container-page py-10">
      <h1 className="page-title">Layanan Publik</h1>
      <p className="page-description">
        Pilih layanan digital yang tersedia untuk warga desa.
      </p>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {portalServices.map((service) => {
          const Icon = icons[service.icon as keyof typeof icons] ?? FileText;
          return (
            <Link key={service.id} href={service.href}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                      <Icon className="h-6 w-6" />
                    </div>
                    <CardTitle>{service.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600">{service.description}</p>
                  <span className="mt-4 inline-flex items-center text-sm font-medium text-emerald-600">
                    Akses layanan
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </span>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
