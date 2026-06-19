import { Card, CardContent, CardHeader, CardTitle } from '@sidpro/ui';
import { fetchPublicTransparency } from '@/lib/public-api';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Transparansi',
};

export default async function TransparansiPage() {
  const data = await fetchPublicTransparency();

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

      {data.documents && data.documents.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Dokumen Publik</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {data.documents.map((doc: { id: string; title: string }) => (
                <li
                  key={doc.id}
                  className="flex items-center justify-between rounded-md border border-slate-100 px-3 py-2"
                >
                  <span className="font-medium text-slate-800">{doc.title}</span>
                  <span className="text-xs text-slate-400">Dokumen resmi desa</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
