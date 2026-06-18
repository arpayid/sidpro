import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@sidpro/ui';
import { demoVillage } from '@/lib/demo-data';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pengaturan',
};

export default function PengaturanPage() {
  return (
    <div>
      <h1 className="page-title">Pengaturan</h1>
      <p className="page-description">Konfigurasi profil desa dan preferensi sistem.</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profil Desa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Nama Desa</label>
              <Input defaultValue={demoVillage.name} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Kode Desa</label>
              <Input defaultValue={demoVillage.code} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Alamat</label>
              <Input defaultValue={demoVillage.address} />
            </div>
            <Button>Simpan Perubahan</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preferensi Sistem</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-600">
            <label className="flex items-center gap-2">
              <input type="checkbox" defaultChecked className="rounded border-slate-300 text-emerald-600" />
              Aktifkan audit log untuk semua mutasi data
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" defaultChecked className="rounded border-slate-300 text-emerald-600" />
              Masking NIK/KK di tampilan operator
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="rounded border-slate-300 text-emerald-600" />
              Wajib 2FA untuk admin
            </label>
            <Button variant="outline">Simpan Preferensi</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
