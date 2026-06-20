const FAQ_ENTRIES = [
  {
    keywords: ['surat', 'domisili', 'sku', 'skck'],
    answer:
      'Permohonan surat dapat diajukan melalui menu Layanan Surat di portal desa atau login sebagai warga di /surat/ajukan.',
  },
  {
    keywords: ['pengaduan', 'aduan', 'komplain'],
    answer:
      'Pengaduan warga dapat disampaikan di /pengaduan. Anda akan menerima nomor tiket untuk pelacakan status.',
  },
  {
    keywords: ['kk', 'kartu keluarga', 'kependudukan', 'nik'],
    answer:
      'Pembaruan data kependudukan dan KK dilayani di kantor desa. Siapkan dokumen pendukung sesuai jenis permohonan.',
  },
  {
    keywords: ['bantuan', 'bansos', 'rtlh'],
    answer:
      'Informasi program bantuan sosial diumumkan melalui portal desa dan papan informasi. Hubungi kantor desa untuk verifikasi eligibility.',
  },
] as const;

export function matchFaqAnswer(question: string): string {
  const normalized = question.toLowerCase();
  for (const entry of FAQ_ENTRIES) {
    if (entry.keywords.some((kw) => normalized.includes(kw))) {
      return entry.answer;
    }
  }
  return 'Terima kasih atas pertanyaan Anda. Untuk informasi lebih lanjut, silakan hubungi kantor desa atau ajukan pengaduan resmi melalui portal.';
}

export function listFaqTopics() {
  return FAQ_ENTRIES.map((entry) => ({
    topic: entry.keywords[0],
    preview: entry.answer.slice(0, 120),
  }));
}
