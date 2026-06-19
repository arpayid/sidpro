/** Mask NIK for display (first 4 + last 4 digits visible). */
export function maskNik(nik: string): string {
  if (nik.length !== 16) return nik;
  return `${nik.slice(0, 4)}********${nik.slice(-4)}`;
}
