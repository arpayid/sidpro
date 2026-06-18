import Link from 'next/link';
import { Shield, Mail, Phone, MapPin } from 'lucide-react';
import { demoVillage } from '@/lib/demo-data';

export function PublicFooter() {
  return (
    <footer className="border-t border-emerald-900/10 bg-emerald-950 text-emerald-50">
      <div className="container-page grid gap-8 py-12 md:grid-cols-3">
        <div>
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-bold">SIDPRO</p>
              <p className="text-xs text-emerald-200">Premium Enterprise</p>
            </div>
          </div>
          <p className="text-sm text-emerald-100">
            Platform digital pemerintahan desa modern untuk pelayanan publik yang transparan dan
            efisien.
          </p>
        </div>

        <div>
          <h3 className="mb-3 font-semibold">Tautan Cepat</h3>
          <ul className="space-y-2 text-sm text-emerald-100">
            <li>
              <Link href="/layanan" className="hover:text-white">
                Layanan Surat
              </Link>
            </li>
            <li>
              <Link href="/pengaduan" className="hover:text-white">
                Pengaduan Warga
              </Link>
            </li>
            <li>
              <Link href="/transparansi" className="hover:text-white">
                Transparansi
              </Link>
            </li>
            <li>
              <Link href="/verifikasi-surat" className="hover:text-white">
                Verifikasi Surat
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="mb-3 font-semibold">Kontak Desa</h3>
          <ul className="space-y-2 text-sm text-emerald-100">
            <li className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{demoVillage.address}</span>
            </li>
            <li className="flex items-center gap-2">
              <Phone className="h-4 w-4 shrink-0" />
              <span>(0298) 123456</span>
            </li>
            <li className="flex items-center gap-2">
              <Mail className="h-4 w-4 shrink-0" />
              <span>info@{demoVillage.code}.go.id</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-emerald-800/50">
        <div className="container-page flex flex-col items-center justify-between gap-2 py-4 text-xs text-emerald-200 sm:flex-row">
          <p>&copy; {new Date().getFullYear()} {demoVillage.name}. Hak cipta dilindungi.</p>
          <p>Ditenagai oleh SIDPRO Enterprise</p>
        </div>
      </div>
    </footer>
  );
}
