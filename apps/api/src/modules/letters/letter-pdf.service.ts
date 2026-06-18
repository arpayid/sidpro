import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

export interface LetterPdfSignatory {
  name: string;
  title: string;
}

export interface LetterPdfVillage {
  name: string;
  address?: string | null;
  regency?: string | null;
  district?: string | null;
  province?: string | null;
}

export interface LetterPdfApplicant {
  fullName: string;
  nik?: string | null;
  address?: string | null;
}

export interface LetterPdfInput {
  village: LetterPdfVillage;
  letterTypeName: string;
  letterNumber: string;
  purpose: string;
  templateContent: string;
  applicant: LetterPdfApplicant;
  signatory: LetterPdfSignatory;
  issuedAt: Date;
  verificationUrl: string;
  qrCode: string;
}

const MONTHS_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

export function formatDateId(date: Date): string {
  return `${date.getDate()} ${MONTHS_ID[date.getMonth()]} ${date.getFullYear()}`;
}

export function renderLetterTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? '');
}

export const DEFAULT_LETTER_TEMPLATE = `Yang bertanda tangan di bawah ini, Kepala {{nama_desa}}, menerangkan bahwa:

Nama        : {{nama_pemohon}}
NIK         : {{nik}}
Alamat      : {{alamat_pemohon}}

Keperluan   : {{keperluan}}

Demikian surat keterangan ini dibuat untuk dipergunakan sebagaimana mestinya.`;

@Injectable()
export class LetterPdfService {
  async generate(input: LetterPdfInput): Promise<Buffer> {
    const issuedDate = formatDateId(input.issuedAt);
    const vars: Record<string, string> = {
      nama_desa: input.village.name,
      alamat_desa: input.village.address ?? '-',
      kabupaten: input.village.regency ?? '-',
      kecamatan: input.village.district ?? '-',
      provinsi: input.village.province ?? '-',
      jenis_surat: input.letterTypeName,
      nomor_surat: input.letterNumber,
      nama_pemohon: input.applicant.fullName,
      nik: input.applicant.nik ?? '-',
      alamat_pemohon: input.applicant.address ?? '-',
      keperluan: input.purpose,
      tanggal: issuedDate,
    };

    const body = renderLetterTemplate(input.templateContent, vars);
    const qrBuffer = await QRCode.toBuffer(input.verificationUrl, {
      width: 140,
      margin: 1,
      errorCorrectionLevel: 'M',
    });

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 56 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      this.drawHeader(doc, input.village);
      doc.moveDown(1.5);

      doc.fontSize(12).font('Helvetica-Bold').text(input.letterTypeName.toUpperCase(), {
        align: 'center',
      });
      doc.moveDown(0.3);
      doc.font('Helvetica').fontSize(10).text(`Nomor: ${input.letterNumber}`, { align: 'center' });
      doc.moveDown(1.2);

      doc.fontSize(11).text(body, { align: 'justify', lineGap: 4 });
      doc.moveDown(2);

      const signY = doc.y;
      const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const signX = doc.page.margins.left + pageWidth * 0.55;

      doc.fontSize(10).text(`${input.village.name}, ${issuedDate}`, signX, signY, {
        width: pageWidth * 0.45,
        align: 'center',
      });
      doc.moveDown(3);
      doc.font('Helvetica-Bold').text(input.signatory.name, signX, doc.y, {
        width: pageWidth * 0.45,
        align: 'center',
      });
      doc.font('Helvetica').text(input.signatory.title, signX, doc.y, {
        width: pageWidth * 0.45,
        align: 'center',
      });

      const qrSize = 88;
      const qrX = doc.page.margins.left;
      const qrY = doc.page.height - doc.page.margins.bottom - qrSize - 28;
      doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });
      doc
        .fontSize(7)
        .fillColor('#444444')
        .text('Verifikasi keaslian surat:', qrX, qrY + qrSize + 4, { width: 160 })
        .text(input.qrCode.slice(0, 8).toUpperCase(), qrX, doc.y, { width: 160 });

      doc.end();
    });
  }

  private drawHeader(doc: InstanceType<typeof PDFDocument>, village: LetterPdfVillage): void {
    const headerLines: { text: string; bold?: boolean; size?: number }[] = [];
    if (village.province) {
      headerLines.push({ text: `PROVINSI ${village.province.toUpperCase()}`, size: 10 });
    }
    if (village.regency) {
      headerLines.push({ text: `PEMERINTAH ${village.regency.toUpperCase()}`, size: 10 });
    }
    if (village.district) {
      headerLines.push({ text: `KECAMATAN ${village.district.toUpperCase()}`, size: 10 });
    }
    headerLines.push({ text: `DESA ${village.name.toUpperCase()}`, bold: true, size: 13 });
    if (village.address) {
      headerLines.push({ text: village.address, size: 9 });
    }

    for (const line of headerLines) {
      doc.font(line.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(line.size ?? 10);
      doc.text(line.text, { align: 'center' });
    }

    const lineY = doc.y + 6;
    const margin = doc.page.margins.left;
    const width = doc.page.width - margin * 2;
    doc
      .moveTo(margin, lineY)
      .lineTo(margin + width * 0.2, lineY)
      .lineWidth(2)
      .stroke('#111111');
    doc
      .moveTo(margin + width * 0.25, lineY)
      .lineTo(margin + width, lineY)
      .lineWidth(0.5)
      .stroke('#111111');
  }
}
