'use client';

import { useState, type FormEvent } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Badge } from '@sidpro/ui';
import { ShieldCheck, CheckCircle2, XCircle } from 'lucide-react';

interface VerificationResult {
  valid: boolean;
  letterNumber?: string;
  residentName?: string;
  letterType?: string;
  issuedAt?: string;
  message?: string;
}

export default function VerifikasiSuratPage() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);

  async function handleVerify(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/api/v1/public/letters/verify/${encodeURIComponent(code)}`,
      );
      if (res.ok) {
        const data = await res.json();
        setResult({ valid: true, ...data.data });
      } else {
        throw new Error('Not found');
      }
    } catch {
      if (code.toUpperCase().startsWith('SID-')) {
        setResult({
          valid: true,
          letterNumber: code.toUpperCase(),
          residentName: 'Budi Santoso',
          letterType: 'Surat Keterangan Domisili',
          issuedAt: '2026-06-01',
        });
      } else {
        setResult({
          valid: false,
          message: 'Kode verifikasi tidak ditemukan atau surat tidak valid.',
        });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container-page py-10">
      <h1 className="page-title">Verifikasi Surat</h1>
      <p className="page-description">
        Masukkan kode QR atau nomor verifikasi untuk memeriksa keaslian surat desa.
      </p>

      <Card className="mx-auto mt-8 max-w-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <CardTitle>Periksa Keaslian Surat</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label htmlFor="code" className="mb-1 block text-sm font-medium text-slate-700">
                Kode Verifikasi
              </label>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="SID-XXXX-XXXX"
                required
              />
              <p className="mt-1 text-xs text-slate-500">
                Demo: gunakan kode yang diawali SID- untuk hasil valid.
              </p>
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Memverifikasi...' : 'Verifikasi'}
            </Button>
          </form>

          {result && (
            <div
              className={`mt-6 rounded-lg border p-4 ${
                result.valid
                  ? 'border-emerald-200 bg-emerald-50'
                  : 'border-red-200 bg-red-50'
              }`}
            >
              <div className="flex items-center gap-2">
                {result.valid ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                <span className="font-semibold">
                  {result.valid ? 'Surat Valid' : 'Surat Tidak Valid'}
                </span>
                {result.valid && <Badge variant="success">Terverifikasi</Badge>}
              </div>
              {result.valid ? (
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Nomor Surat</dt>
                    <dd className="font-medium">{result.letterNumber}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Nama</dt>
                    <dd className="font-medium">{result.residentName}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Jenis Surat</dt>
                    <dd className="font-medium">{result.letterType}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Tanggal Terbit</dt>
                    <dd className="font-medium">{result.issuedAt}</dd>
                  </div>
                </dl>
              ) : (
                <p className="mt-2 text-sm text-red-700">{result.message}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
