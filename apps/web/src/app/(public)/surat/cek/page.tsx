import { Suspense } from 'react';
import { CekSuratForm } from './cek-surat-form';

export default function CekSuratPage() {
  return (
    <Suspense fallback={<div className="container-page py-10">Memuat...</div>}>
      <CekSuratForm />
    </Suspense>
  );
}
