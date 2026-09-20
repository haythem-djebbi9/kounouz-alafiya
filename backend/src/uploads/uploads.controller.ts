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
const PRODUCERS_DIR = join(process.cwd(), 'uploads', 'producers');
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

for (const dir of [SAMPLES_DIR, PRODUCERS_DIR]) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function imageInterceptor(destination: string) {
  return FileInterceptor('file', {
    storage: diskStorage({
      destination,
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
  });
}

// Stockage disque local ; structure prête à être remplacée par un stockage
// cloud plus tard (voir cahier des charges section 3). Les pièces
// administratives sensibles passent par /producer-documents (stockage privé).
@ApiBearerAuth()
@ApiTags('uploads')
@Controller('uploads')
export class UploadsController {
  // Preuves de collecte (photos) — Agent Terrain.
  @Roles(Role.FIELD_AGENT)
  @Post('sample-photo')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(imageInterceptor(SAMPLES_DIR))
  uploadSamplePhoto(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Aucun fichier reçu.');
    }
    return { url: `/uploads/samples/${file.filename}` };
  }

  // Photo de profil et photos de l'exploitation — Producteur.
  @Roles(Role.PRODUCER)
  @Post('producer-image')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(imageInterceptor(PRODUCERS_DIR))
  uploadProducerImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Aucun fichier reçu.');
    }
    return { url: `/uploads/producers/${file.filename}` };
  }
}
