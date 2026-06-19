'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@sidpro/ui';
import { Building2, Users, FileText, MessageSquare } from 'lucide-react';
import { useRegencyOverview } from '@/features/tenants/use-regency-overview';

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof Users;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-slate-500">{label}</p>
          <p className="text-xl font-semibold text-slate-900">{value.toLocaleString('id-ID')}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function KabupatenContent() {
  const { data, isLoading, error } = useRegencyOverview();

  if (isLoading) {
    return <p className="text-sm text-slate-500">Memuat dashboard kabupaten...</p>;
  }

  if (error || !data) {
    return (
      <p className="text-sm text-red-600">
        {(error as Error)?.message ?? 'Dashboard kabupaten tidak tersedia untuk akun ini.'}
      </p>
    );
  }

  return (
    <div>
      <h1 className="page-title">Dashboard Kabupaten</h1>
      <p className="page-description">
        Ringkasan agregat lintas desa — {data.regency.name} ({data.villageCount} desa).
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Penduduk" value={data.totals.residents} icon={Users} />
        <StatCard label="Total Keluarga" value={data.totals.families} icon={Building2} />
        <StatCard label="Surat Pending" value={data.totals.pendingLetters} icon={FileText} />
        <StatCard label="Pengaduan Aktif" value={data.totals.openComplaints} icon={MessageSquare} />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Desa di Bawah Kabupaten</CardTitle>
        </CardHeader>
        <CardContent>
          {data.villages.length === 0 ? (
            <p className="text-sm text-slate-500">Belum ada desa terdaftar.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-slate-500">
                    <th className="py-2 pr-4">Desa</th>
                    <th className="py-2 pr-4">Kode</th>
                    <th className="py-2 pr-4">Penduduk</th>
                    <th className="py-2 pr-4">Surat Pending</th>
                    <th className="py-2">Pengaduan Aktif</th>
                  </tr>
                </thead>
                <tbody>
                  {data.villages.map((village) => (
                    <tr key={village.id} className="border-b border-slate-100">
                      <td className="py-3 pr-4 font-medium">{village.name}</td>
                      <td className="py-3 pr-4 text-slate-600">{village.code}</td>
                      <td className="py-3 pr-4">{village.residentCount}</td>
                      <td className="py-3 pr-4">{village.pendingLetterCount}</td>
                      <td className="py-3">{village.openComplaintCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
