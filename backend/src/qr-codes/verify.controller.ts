import { Body, Controller, Get, Header, HttpCode, HttpStatus, Param, Post, Query, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { QrCodesService } from './qr-codes.service.js';
import { RecordScanDto, ReportLabelDto } from './dto/record-scan.dto.js';
import { Public } from '../auth/decorators/public.decorator.js';
import { clientIp } from '../common/request-context.js';

// Page de vérification publique — aucune authentification requise, un scan
// consommateur doit toujours fonctionner. Chaque appel journalise un QRScan,
// y compris sur un identifiant inconnu (signal de contrefaçon).
@ApiTags('verify')
@Public()
// Endpoint public exposé à l'abus (énumération de QR, scan en masse) : plafond
// par IP (§12 / §Infra 11). Le scan reste journalisé pour l'anti-contrefaçon.
@Throttle({ default: { ttl: 60_000, limit: 60 } })
@Controller('verify')
export class VerifyController {
  constructor(private readonly service: QrCodesService) {}

  @Get(':qrId')
  get(@Param('qrId') qrId: string, @Query() scan: RecordScanDto, @Req() req: Request) {
    return this.service.getPublicVerification(qrId, scan, req.headers['user-agent'], clientIp(req));
  }

  @Post(':qrId/report')
  @HttpCode(HttpStatus.NO_CONTENT)
  async report(@Param('qrId') qrId: string, @Body() dto: ReportLabelDto, @Req() req: Request) {
    await this.service.reportLabel(qrId, dto, req.headers['user-agent'], clientIp(req));
  }

  @Get(':qrId/image')
  @Header('Content-Type', 'image/png')
  async image(@Param('qrId') qrId: string, @Res({ passthrough: true }) res: Response) {
    const buffer = await this.service.generateImage(qrId);
    res.send(buffer);
  }
}
