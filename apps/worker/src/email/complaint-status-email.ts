import type { ComplaintStatusEmailJob, EmailMessage } from '@sidpro/types';

export function buildComplaintStatusEmail(job: ComplaintStatusEmailJob): EmailMessage {
  const greeting = job.reporterName ? `Yth. ${job.reporterName},` : 'Yth. Pelapor,';
  const trackUrl = job.appUrl
    ? `${job.appUrl.replace(/\/$/, '')}/pengaduan/cek?ticket=${encodeURIComponent(job.ticket)}`
    : null;

  const lines = [
    greeting,
    '',
    `Pengaduan Anda "${job.title}" (${job.ticket}) telah diperbarui.`,
    `Status: ${job.fromStatusLabel} → ${job.statusLabel}`,
  ];

  if (job.note) {
    lines.push('', 'Catatan petugas:', job.note);
  }

  if (trackUrl) {
    lines.push('', `Lacak status pengaduan: ${trackUrl}`);
  }

  lines.push('', '—', 'SIDPRO — Sistem Informasi Desa');

  const text = lines.join('\n');
  const html = text
    .split('\n')
    .map((line) => (line ? `<p>${escapeHtml(line)}</p>` : '<br />'))
    .join('');

  return {
    to: job.reporterEmail,
    subject: `[SIDPRO] Update pengaduan ${job.ticket} — ${job.statusLabel}`,
    text,
    html,
  };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
