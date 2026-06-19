/** Mask KK number for display (first 4 + last 4 digits visible). */
export function maskKk(kk: string): string {
  if (kk.length !== 16) return kk;
  return `${kk.slice(0, 4)}********${kk.slice(-4)}`;
}
