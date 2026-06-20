'use client';

import { usePublicMap } from '@/features/gis/use-public-map';

export default function PetaDesaPage() {
  const { data, isLoading, error } = usePublicMap();

  if (isLoading) {
    return (
      <div className="container-page py-12">
        <p className="text-sm text-slate-500">Memuat peta desa...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container-page py-12">
        <p className="text-sm text-red-600">Peta desa tidak dapat dimuat.</p>
      </div>
    );
  }

  const { lat, lng } = data.center;
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.02}%2C${lat - 0.02}%2C${lng + 0.02}%2C${lat + 0.02}&layer=mapnik&marker=${lat}%2C${lng}`;

  return (
    <div className="container-page py-10">
      <h1 className="text-2xl font-bold text-slate-900">Peta Desa</h1>
      <p className="mt-1 text-slate-600">{data.villageName} — lokasi pusat administrasi desa.</p>
      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 shadow-sm">
        <iframe
          title={`Peta ${data.villageName}`}
          src={mapUrl}
          className="h-[480px] w-full"
          loading="lazy"
        />
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Peta interaktif dasar (Post-MVP GIS). Koordinat dapat diatur admin desa via pengaturan GIS.
      </p>
    </div>
  );
}
