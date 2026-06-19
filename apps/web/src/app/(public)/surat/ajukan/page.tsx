import { AjukanSuratForm } from './ajukan-surat-form';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Ajukan Surat',
};

export default function AjukanSuratPage() {
  return (
    <div className="container-page py-10">
      <h1 className="page-title">Ajukan Surat Online</h1>
      <p className="page-description">
        Warga terdaftar dapat mengajukan permohonan surat keterangan desa secara digital.
      </p>
      <AjukanSuratForm />
    </div>
  );
}
