'use client';

import { Button, Card, CardContent, CardHeader, CardTitle } from '@sidpro/ui';
import { FileBarChart, Download } from 'lucide-react';
import { ErrorState } from '@/components/enterprise/error-state';
import { KpiSkeleton } from '@/components/enterprise/loading-skeleton';
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

  const hasReportError =
    (population.isError && can('reports.population')) ||
    (letters.isError && can('reports.letters')) ||
    (finance.isError && can('reports.finance'));

  const reports = [
    {
      id: 'population',
      name: 'Laporan Kependudukan',
      period: 'Data terkini',
      loading: population.isLoading || exportPopulation.isPending,
      error: population.isError,
      preview: population.data
        ? `${population.data.byGender.reduce((sum, g) => sum + g._count.id, 0)} penduduk terdata`
        : '—',
      canView: can('reports.population'),
      canExport: can('reports.export') && can('reports.population'),
      onExport: () => exportPopulation.mutate(),
      exportLabel: 'Unduh XLSX',
      onRetry: () => population.refetch(),
    },
    {
      id: 'letters',
      name: 'Laporan Surat Masuk/Keluar',
      period: 'Data terkini',
      loading: letters.isLoading || exportLetters.isPending,
      error: letters.isError,
      preview: letters.data
        ? `${letters.data.byStatus.reduce((sum, s) => sum + s._count.id, 0)} permohonan surat`
        : '—',
      canView: can('reports.letters'),
      canExport: can('reports.export') && can('reports.letters'),
      onExport: () => exportLetters.mutate(),
      exportLabel: 'Unduh XLSX',
      onRetry: () => letters.refetch(),
    },
    {
      id: 'finance',
      name: 'Laporan Keuangan Desa',
      period: finance.data ? `Tahun ${finance.data.year}` : 'Tahun berjalan',
      loading: finance.isLoading || exportFinance.isPending,
      error: finance.isError,
      preview: finance.data
        ? `Serapan anggaran ${finance.data.summary.absorptionRate}%`
        : '—',
      canView: can('reports.finance'),
      canExport: can('reports.export') && can('reports.finance'),
      onExport: () => exportFinance.mutate(),
      exportLabel: 'Unduh XLSX',
      onRetry: () => finance.refetch(),
    },
    {
      id: 'complaints',
      name: 'Laporan Pengaduan',
      period: 'Export CSV',
      loading: exportComplaints.isPending,
      error: false,
      preview: 'Unduh data pengaduan lengkap',
      canView: can('complaints.read'),
      canExport: can('complaints.read'),
      onExport: () => exportComplaints.mutate(),
      exportLabel: 'Unduh CSV',
      onRetry: undefined,
    },
  ];

  const visibleReports = reports.filter((r) => r.canView);

  if (hasReportError) {
    return (
      <div>
        <h1 className="page-title">Laporan</h1>
        <p className="page-description">Ekspor laporan operasional dan administrasi desa.</p>
        <ErrorState
          className="mt-6"
          message="Beberapa laporan gagal dimuat. Periksa koneksi atau coba lagi."
          onRetry={() => {
            if (population.isError) population.refetch();
            if (letters.isError) letters.refetch();
            if (finance.isError) finance.refetch();
          }}
        />
      </div>
    );
  }

  return (
    <div>
      <h1 className="page-title">Laporan</h1>
      <p className="page-description">Ekspor laporan operasional dan administrasi desa.</p>

      {visibleReports.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">
          Anda tidak memiliki izin untuk melihat laporan. Hubungi admin desa.
        </p>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {reports.map((report) => {
            if (!report.canView) return null;

            return (
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
                  {report.loading ? (
                    <KpiSkeleton count={1} />
                  ) : report.error ? (
                    <ErrorState
                      message="Gagal memuat preview laporan."
                      onRetry={report.onRetry}
                    />
                  ) : (
                    <>
                      <p className="text-sm text-slate-600">{report.preview}</p>
                      {report.id === 'finance' && finance.data && (
                        <p className="text-xs text-slate-500">
                          Anggaran: {formatCurrency(finance.data.summary.totalBudget)} · Realisasi:{' '}
                          {formatCurrency(finance.data.summary.totalRealized)}
                        </p>
                      )}
                    </>
                  )}
                  {report.onExport ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!report.canExport || report.loading || report.error}
                      onClick={report.onExport}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      {report.exportLabel ?? 'Unduh'}
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
