import { Controller, Get, Header, Headers, Param, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags } from '@nestjs/swagger';
import { QrCodesService } from './qr-codes.service.js';
import { RecordScanDto } from './dto/record-scan.dto.js';
import { Public } from '../auth/decorators/public.decorator.js';

// Page de vérification publique — aucune authentification requise, un scan
// consommateur doit toujours fonctionner. Chaque appel journalise un QRScan.
@ApiTags('verify')
@Public()
@Controller('verify')
export class VerifyController {
  constructor(private readonly service: QrCodesService) {}

  @Get(':qrId')
  get(
    @Param('qrId') qrId: string,
    @Query() scan: RecordScanDto,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.service.getPublicVerification(qrId, scan, userAgent);
  }

  @Get(':qrId/image')
  @Header('Content-Type', 'image/png')
  async image(@Param('qrId') qrId: string, @Res({ passthrough: true }) res: Response) {
    const buffer = await this.service.generateImage(qrId);
    res.send(buffer);
  }
}
