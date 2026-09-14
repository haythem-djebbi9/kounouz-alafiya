import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { diskStorage } from 'multer';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';
import { Roles } from '../auth/decorators/roles.decorator.js';

const SAMPLES_DIR = join(process.cwd(), 'uploads', 'samples');
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

if (!existsSync(SAMPLES_DIR)) {
  mkdirSync(SAMPLES_DIR, { recursive: true });
}

// Preuves de collecte (photos) — Agent Terrain uniquement pour l'instant.
// Stockage disque local ; structure prête à être remplacée par un stockage
// cloud plus tard (voir cahier des charges section 3).
@ApiBearerAuth()
@ApiTags('uploads')
@Roles(Role.FIELD_AGENT)
@Controller('uploads')
export class UploadsController {
  @Post('sample-photo')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: SAMPLES_DIR,
        filename: (_req, file, cb) => {
          cb(null, `${randomUUID()}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: MAX_SIZE_BYTES },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
          cb(new BadRequestException('Seules les images JPEG, PNG ou WebP sont acceptées.'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  uploadSamplePhoto(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Aucun fichier reçu.');
    }
    return { url: `/uploads/samples/${file.filename}` };
  }
}
