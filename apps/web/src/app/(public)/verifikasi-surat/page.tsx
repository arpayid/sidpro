import { Suspense } from 'react';
import { VerifikasiSuratForm } from './verifikasi-surat-form';

export default function VerifikasiSuratPage() {
  return (
    <Suspense
      fallback={
        <div className="container-page py-10">
          <h1 className="page-title">Verifikasi Surat</h1>
          <p className="page-description">Memuat formulir verifikasi...</p>
        </div>
      }
    >
      <VerifikasiSuratForm />
    </Suspense>
  );
}
