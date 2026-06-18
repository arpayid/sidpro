import { Suspense } from 'react';
import { CekPengaduanForm } from './cek-pengaduan-form';

export default function CekPengaduanPage() {
  return (
    <Suspense
      fallback={
        <div className="container-page py-10">
          <h1 className="page-title">Cek Status Pengaduan</h1>
          <p className="page-description">Memuat formulir...</p>
        </div>
      }
    >
      <CekPengaduanForm />
    </Suspense>
  );
}
