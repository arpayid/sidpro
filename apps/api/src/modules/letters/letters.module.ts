import { Module } from '@nestjs/common';
import { LettersService } from './letters.service';
import { LettersController } from './letters.controller';
import { LetterPdfService } from './letter-pdf.service';

@Module({
  controllers: [LettersController],
  providers: [LettersService, LetterPdfService],
  exports: [LettersService],
})
export class LettersModule {}
