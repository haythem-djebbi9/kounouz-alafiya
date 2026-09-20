import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import type { Response } from 'express';
import { diskStorage } from 'multer';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { DOCUMENTS_DIR, ProducerDocumentsService } from './producer-documents.service.js';
import { ReviewProducerDocumentDto, UploadProducerDocumentDto } from './dto/producer-document.dto.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { JwtPayload } from '../auth/types/jwt-payload.type.js';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

@ApiBearerAuth()
@ApiTags('producer-documents')
@Controller('producer-documents')
export class ProducerDocumentsController {
  constructor(private readonly service: ProducerDocumentsService) {}

  @Roles(Role.PRODUCER)
  @Get('mine')
  findMine(@CurrentUser() user: JwtPayload) {
    return this.service.findMine(user.sub);
  }

  @Roles(Role.PRODUCER)
  @Post()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: DOCUMENTS_DIR,
        filename: (_req, file, cb) => cb(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`),
      }),
      limits: { fileSize: MAX_SIZE_BYTES },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
          cb(new BadRequestException('Formats acceptés : JPG, PNG ou PDF.'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  upload(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UploadProducerDocumentDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Aucun fichier reçu.');
    }
    return this.service.upload(user.sub, dto.type, file);
  }

  @Get(':id/file')
  async file(@Param('id') id: string, @CurrentUser() user: JwtPayload, @Res() res: Response) {
    const { path, mimeType, fileName } = await this.service.getFileForUser(id, user);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileName)}"`);
    res.sendFile(path);
  }

  @Roles(Role.PRODUCER)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    await this.service.remove(id, user.sub);
  }

  // --- Équipe Kounouz --------------------------------------------------------

  @Roles(Role.ADMIN, Role.VERIFICATION_TEAM)
  @Get('producer/:producerId')
  findForProducer(@Param('producerId') producerId: string) {
    return this.service.findForProducer(producerId);
  }

  @Roles(Role.ADMIN, Role.VERIFICATION_TEAM)
  @Patch(':id/review')
  review(@Param('id') id: string, @CurrentUser() user: JwtPayload, @Body() dto: ReviewProducerDocumentDto) {
    return this.service.review(id, user.sub, dto.status, dto.note);
  }
}
