import { Card, CardContent, CardHeader, CardTitle } from '@sidpro/ui';
import { apiFetchWithFallback } from '@/lib/api';
import { demoTransparency } from '@/lib/demo-data';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Transparansi',
};

export default async function TransparansiPage() {
  const data = await apiFetchWithFallback('/api/v1/public/transparency', demoTransparency);

  return (
    <div className="container-page py-10">
      <h1 className="page-title">Transparansi Desa</h1>
      <p className="page-description">
        Informasi keuangan dan progres pembangunan desa secara terbuka.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ringkasan APBD Desa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.apbd.map((item: { category: string; amount: string; percentage: string }) => (
                <div
                  key={item.category}
                  className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-0"
                >
                  <span className="text-sm text-slate-600">{item.category}</span>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900">{item.amount}</p>
                    <p className="text-xs text-slate-400">{item.percentage}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Progres Pembangunan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.projects.map(
              (project: { name: string; budget: string; progress: number }) => (
                <div key={project.name}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-medium text-slate-900">{project.name}</span>
                    <span className="text-slate-500">{project.progress}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{project.budget}</p>
                </div>
              ),
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
