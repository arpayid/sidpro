'use client';

import { Input } from '@sidpro/ui';
import { useHamlets, useNeighborhoodUnits } from '@/features/territories/use-territories';

interface AddressFieldsProps {
  hamletId: string;
  neighborhoodUnitId: string;
  street: string;
  onHamletChange: (id: string) => void;
  onNeighborhoodUnitChange: (id: string) => void;
  onStreetChange: (value: string) => void;
  errors?: {
    hamletId?: { message?: string };
    neighborhoodUnitId?: { message?: string };
    street?: { message?: string };
  };
}

export function AddressFields({
  hamletId,
  neighborhoodUnitId,
  street,
  onHamletChange,
  onNeighborhoodUnitChange,
  onStreetChange,
  errors,
}: AddressFieldsProps) {
  const { data: hamlets = [], isLoading: hamletsLoading } = useHamlets();
  const { data: units = [], isLoading: unitsLoading } = useNeighborhoodUnits(hamletId || null);

  return (
    <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50/50 p-4">
      <p className="text-sm font-medium text-slate-700">Alamat / Wilayah</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="form-label" htmlFor="hamletId">
            Dusun
          </label>
          <select
            id="hamletId"
            className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
            value={hamletId}
            onChange={(e) => {
              onHamletChange(e.target.value);
              onNeighborhoodUnitChange('');
            }}
            disabled={hamletsLoading}
          >
            <option value="">Pilih dusun</option>
            {hamlets.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name} ({h.code})
              </option>
            ))}
          </select>
          {errors?.hamletId && <p className="form-error">{errors.hamletId.message}</p>}
        </div>
        <div>
          <label className="form-label" htmlFor="neighborhoodUnitId">
            RT / RW
          </label>
          <select
            id="neighborhoodUnitId"
            className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
            value={neighborhoodUnitId}
            onChange={(e) => onNeighborhoodUnitChange(e.target.value)}
            disabled={!hamletId || unitsLoading}
          >
            <option value="">Pilih RT/RW</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                RT {u.rt} / RW {u.rw}
              </option>
            ))}
          </select>
          {errors?.neighborhoodUnitId && (
            <p className="form-error">{errors.neighborhoodUnitId.message}</p>
          )}
        </div>
      </div>
      <div>
        <label className="form-label" htmlFor="street">
          Jalan / Detail Alamat
        </label>
        <Input
          id="street"
          value={street}
          onChange={(e) => onStreetChange(e.target.value)}
          placeholder="Nama jalan, nomor rumah, dll."
        />
        {errors?.street && <p className="form-error">{errors.street.message}</p>}
      </div>
    </div>
  );
}
