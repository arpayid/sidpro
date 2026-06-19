'use client';

import { Button, Card, CardContent, CardHeader, CardTitle } from '@sidpro/ui';
import { FileBarChart, Download } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import {
  usePopulationReport,
  useLettersReport,
  useFinanceReport,
  useExportPopulationReport,
  useExportLettersReport,
  useExportFinanceReport,
} from '@/features/reports/use-reports';
import { useExportComplaints } from '@/features/complaints/use-complaints';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value);
}

export function LaporanContent() {
  const { can } = useAuth();
  const population = usePopulationReport();
  const letters = useLettersReport();
  const finance = useFinanceReport();
  const exportComplaints = useExportComplaints();
  const exportPopulation = useExportPopulationReport();
  const exportLetters = useExportLettersReport();
  const exportFinance = useExportFinanceReport(finance.data?.year);

  const reports = [
    {
      id: 'population',
      name: 'Laporan Kependudukan',
      period: 'Data terkini',
      loading: population.isLoading || exportPopulation.isPending,
      preview: population.data
        ? `${population.data.byGender.reduce((sum, g) => sum + g._count.id, 0)} penduduk terdata`
        : '—',
      canView: can('reports.population'),
      canExport: can('reports.export'),
      onExport: () => exportPopulation.mutate(),
      exportLabel: 'Unduh XLSX',
    },
    {
      id: 'letters',
      name: 'Laporan Surat Masuk/Keluar',
      period: 'Data terkini',
      loading: letters.isLoading || exportLetters.isPending,
      preview: letters.data
        ? `${letters.data.byStatus.reduce((sum, s) => sum + s._count.id, 0)} permohonan surat`
        : '—',
      canView: can('reports.letters'),
      canExport: can('reports.export'),
      onExport: () => exportLetters.mutate(),
      exportLabel: 'Unduh XLSX',
    },
    {
      id: 'finance',
      name: 'Laporan Keuangan Desa',
      period: finance.data ? `Tahun ${finance.data.year}` : 'Tahun berjalan',
      loading: finance.isLoading || exportFinance.isPending,
      preview: finance.data
        ? `Serapan anggaran ${finance.data.summary.absorptionRate}%`
        : '—',
      canView: can('reports.finance'),
      canExport: can('reports.export'),
      onExport: () => exportFinance.mutate(),
      exportLabel: 'Unduh XLSX',
    },
    {
      id: 'complaints',
      name: 'Laporan Pengaduan',
      period: 'Export CSV',
      loading: exportComplaints.isPending,
      preview: 'Unduh data pengaduan lengkap',
      canView: can('complaints.read'),
      canExport: can('complaints.read'),
      onExport: () => exportComplaints.mutate(),
      exportLabel: 'Unduh CSV',
    },
  ];

  return (
    <div>
      <h1 className="page-title">Laporan</h1>
      <p className="page-description">Ekspor laporan operasional dan administrasi desa.</p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {reports.map((report) => (
          <Card key={report.id}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <FileBarChart className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base">{report.name}</CardTitle>
                  <p className="text-sm text-slate-500">{report.period}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-slate-600">
                {report.loading ? 'Memuat preview...' : report.preview}
              </p>
              {report.id === 'finance' && finance.data && (
                <p className="text-xs text-slate-500">
                  Anggaran: {formatCurrency(finance.data.summary.totalBudget)} · Realisasi:{' '}
                  {formatCurrency(finance.data.summary.totalRealized)}
                </p>
              )}
              {report.onExport ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!report.canExport || report.loading}
                  onClick={report.onExport}
                >
                  <Download className="mr-2 h-4 w-4" />
                  {report.exportLabel ?? 'Unduh'}
                </Button>
              ) : (
                <Button variant="outline" size="sm" disabled={!report.canView || report.loading}>
                  <Download className="mr-2 h-4 w-4" />
                  Preview API
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
