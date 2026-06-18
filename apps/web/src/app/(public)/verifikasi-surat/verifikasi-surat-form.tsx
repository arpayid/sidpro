'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Badge } from '@sidpro/ui';
import { ShieldCheck, CheckCircle2, XCircle } from 'lucide-react';
import { API_BASE, API_PREFIX } from '@/lib/api-client';

interface VerificationResult {
  valid: boolean;
  letterNumber?: string;
  residentName?: string;
  letterType?: string;
  issuedAt?: string;
  message?: string;
}

export function VerifikasiSuratForm() {
  const searchParams = useSearchParams();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);

  useEffect(() => {
    const initial = searchParams.get('code');
    if (initial) {
      setCode(initial);
      void verifyCode(initial);
    }
  }, [searchParams]);

  async function verifyCode(verificationCode: string) {
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch(
        `${API_BASE}${API_PREFIX}/letters/verify/${encodeURIComponent(verificationCode.trim())}`,
      );
      const body = await res.json().catch(() => ({}));

      if (res.ok && body.data) {
        const data = body.data as {
          valid: boolean;
          letterNumber?: string;
          residentName?: string;
          letterType?: string;
          issuedAt?: string;
          signedAt?: string;
        };
        setResult({
          valid: data.valid,
          letterNumber: data.letterNumber,
          residentName: data.residentName,
          letterType: data.letterType,
          issuedAt: data.issuedAt ?? data.signedAt,
        });
      } else {
        setResult({
          valid: false,
          message: body.message ?? 'Kode verifikasi tidak ditemukan atau surat tidak valid.',
        });
      }
    } catch {
      setResult({
        valid: false,
        message: 'Gagal menghubungi server verifikasi. Coba lagi nanti.',
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    await verifyCode(code);
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
                placeholder="Scan QR atau tempel kode verifikasi"
                required
              />
              <p className="mt-1 text-xs text-slate-500">
                Kode tercantum pada QR di bagian bawah surat PDF yang diterbitkan desa.
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
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">Nomor Surat</dt>
                    <dd className="text-right font-medium">{result.letterNumber ?? '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">Nama</dt>
                    <dd className="text-right font-medium">{result.residentName ?? '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">Jenis Surat</dt>
                    <dd className="text-right font-medium">{result.letterType ?? '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">Tanggal Terbit</dt>
                    <dd className="text-right font-medium">
                      {result.issuedAt
                        ? new Date(result.issuedAt).toLocaleDateString('id-ID')
                        : '—'}
                    </dd>
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
