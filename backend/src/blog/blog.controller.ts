import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import type { Response } from 'express';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Public } from '../auth/decorators/public.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { JwtPayload } from '../auth/types/jwt-payload.type.js';
import { BlogService, COVER_MAX_BYTES } from './blog.service.js';
import { CreateBlogPostDto, UpdateBlogPostDto } from './dto/blog-post.dto.js';
import { BLOG_CATEGORIES } from './blog-text.js';

// Les pages publiques du blog changent rarement : une minute de cache
// navigateur/CDN, puis resservies pendant la revalidation.
const PUBLIC_CACHE = 'public, max-age=60, stale-while-revalidate=600';

@ApiTags('blog')
@Controller('blog')
export class BlogController {
  constructor(private readonly service: BlogService) {}

  // --- Console d'administration (déclarée avant /:slug) ---------------------

  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Get('admin')
  @ApiOperation({ summary: 'Tous les articles, brouillons compris' })
  listAll() {
    return this.service.listAll();
  }

  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Get('admin/:id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateBlogPostDto) {
    return this.service.create(user.sub, dto);
  }

  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Patch(':id')
  update(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: UpdateBlogPostDto) {
    return this.service.update(user.sub, id, dto);
  }

  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Delete(':id')
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.remove(user.sub, id);
  }

  // L'image est gardée en base, pas sur le disque : celui des hébergeurs
  // gratuits est effacé à chaque redémarrage.
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Post(':id/cover')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: COVER_MAX_BYTES } }))
  uploadCover(@CurrentUser() user: JwtPayload, @Param('id') id: string, @UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Aucun fichier reçu.');
    return this.service.setCover(user.sub, id, file);
  }

  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Delete(':id/cover')
  removeCover(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.removeCover(user.sub, id);
  }

  // --- Vitrine ----------------------------------------------------------------

  @Public()
  @Get()
  @Header('Cache-Control', PUBLIC_CACHE)
  @ApiOperation({ summary: 'Articles publiés, du plus récent au plus ancien' })
  listPublished(
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('category') category?: string,
  ) {
    if (category && !(BLOG_CATEGORIES as readonly string[]).includes(category)) {
      throw new BadRequestException('Rubrique inconnue.');
    }
    return this.service.listPublished(limit, category);
  }

  @Public()
  @Get(':idOrSlug/cover')
  async cover(@Param('idOrSlug') idOrSlug: string, @Res() res: Response) {
    const file = await this.service.coverFile(idOrSlug);
    res.setHeader('Content-Type', file.mime);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Last-Modified', file.updatedAt.toUTCString());
    res.send(file.data);
  }

  @Public()
  @Get(':slug')
  @Header('Cache-Control', PUBLIC_CACHE)
  findPublished(@Param('slug') slug: string) {
    return this.service.findPublished(slug);
  }
}
