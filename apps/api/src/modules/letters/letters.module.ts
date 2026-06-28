import { Module } from '@nestjs/common';
import { LettersService } from './letters.service';
import { LettersController } from './letters.controller';
import { LetterPdfService } from './letter-pdf.service';
import { LetterPdfStorageCompensationInterceptor } from './letter-pdf-storage-compensation.interceptor';

@Module({
  controllers: [LettersController],
  providers: [LettersService, LetterPdfService, LetterPdfStorageCompensationInterceptor],
  exports: [LettersService],
})
export class LettersModule {}
