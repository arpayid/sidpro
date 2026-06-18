import { Button, Card, CardContent, CardHeader, CardTitle } from '@sidpro/ui';
import { FileBarChart, Download } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Laporan',
};

const reports = [
  { id: '1', name: 'Laporan Kependudukan', period: 'Juni 2026', format: 'PDF' },
  { id: '2', name: 'Laporan Surat Masuk/Keluar', period: 'Juni 2026', format: 'Excel' },
  { id: '3', name: 'Laporan Keuangan Desa', period: 'Semester 1 2026', format: 'PDF' },
  { id: '4', name: 'Laporan Pengaduan', period: 'Juni 2026', format: 'PDF' },
];

export default function LaporanPage() {
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
            <CardContent>
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Unduh {report.format}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
