import { BantuanSosialContent } from './bantuan-sosial-content';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Bantuan Sosial',
};

export default function BantuanSosialPage() {
  return <BantuanSosialContent />;
}
