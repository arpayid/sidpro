import { BadRequestException } from '@nestjs/common';

const MAGIC_CHECKS: Record<string, (buffer: Buffer) => boolean> = {
  'image/jpeg': (buffer) => buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
  'image/png': (buffer) =>
    buffer.length >= 4 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47,
  'image/webp': (buffer) =>
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP',
  'application/pdf': (buffer) =>
    buffer.length >= 4 && buffer.subarray(0, 4).toString('ascii') === '%PDF',
};

export function assertMimeMatchesBuffer(mimetype: string, buffer: Buffer): void {
  const check = MAGIC_CHECKS[mimetype];
  if (!check || !check(buffer)) {
    throw new BadRequestException('Konten file tidak sesuai tipe yang dinyatakan');
  }
}
