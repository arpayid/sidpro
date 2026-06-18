import Link from 'next/link';
import { Badge, Button } from '@sidpro/ui';
import { DataTable } from '@/components/shared/data-table';
import { demoNews, formatDate } from '@/lib/demo-data';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Berita CMS',
};

export default function AdminBeritaPage() {
  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">Manajemen Berita</h1>
          <p className="page-description">Kelola konten berita dan pengumuman portal desa.</p>
        </div>
        <Button>Tulis Berita</Button>
      </div>

      <div className="mt-6">
        <DataTable
          data={demoNews}
          columns={[
            { key: 'title', header: 'Judul', cell: (row) => row.title },
            { key: 'category', header: 'Kategori', cell: (row) => <Badge variant="secondary">{row.category}</Badge> },
            { key: 'author', header: 'Penulis', cell: (row) => row.author },
            { key: 'date', header: 'Tanggal', cell: (row) => formatDate(row.publishedAt) },
            {
              key: 'actions',
              header: 'Aksi',
              cell: (row) => (
                <Link href={`/berita/${row.slug}`} className="text-sm text-emerald-600 hover:underline">
                  Lihat
                </Link>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}
