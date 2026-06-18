import { Card, CardContent, CardHeader, CardTitle } from '@sidpro/ui';
import { fetchPublicVillage } from '@/lib/public-api';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Profil Desa',
};

export default async function ProfilDesaPage() {
  const village = await fetchPublicVillage();

  return (
    <div className="container-page py-10">
      <h1 className="page-title">Profil Desa</h1>
      <p className="page-description">Informasi resmi {village.name}</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Identitas Desa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500">Nama Desa</span>
              <span className="font-medium">{village.name}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500">Kode Desa</span>
              <span className="font-medium">{village.code}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500">Provinsi</span>
              <span className="font-medium">{village.province}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500">Kabupaten</span>
              <span className="font-medium">{village.regency}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500">Kecamatan</span>
              <span className="font-medium">{village.district}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Alamat</span>
              <span className="max-w-xs text-right font-medium">{village.address}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Visi & Misi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-700">
            <div>
              <h3 className="font-semibold text-emerald-700">Visi</h3>
              <p className="mt-1">{village.vision}</p>
            </div>
            <div>
              <h3 className="font-semibold text-emerald-700">Misi</h3>
              <p className="mt-1">{village.mission}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
