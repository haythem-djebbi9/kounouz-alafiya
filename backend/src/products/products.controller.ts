import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ProductStatus, Role } from '@prisma/client';
import { ProductsService } from './products.service.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { UpdateProductStatusDto } from './dto/update-product-status.dto.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Public } from '../auth/decorators/public.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { JwtPayload } from '../auth/types/jwt-payload.type.js';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly service: ProductsService) {}

  // --- Catalogue public (marketplace) ---------------------------------

  @Public()
  @Get('catalog')
  findPublicCatalog(@Query('categorie') categorieSlug?: string) {
    return this.service.findPublicCatalog(categorieSlug);
  }

  @Public()
  @Get('catalog/:id')
  findPublicOne(@Param('id') id: string) {
    return this.service.findPublicOne(id);
  }

  // --- Portail Producteur ----------------------------------------------

  @ApiBearerAuth()
  @Roles(Role.PRODUCER)
  @Get('mine')
  findMine(@CurrentUser() user: JwtPayload) {
    return this.service.findMineForProducer(user.sub);
  }

  // --- Gestion (Admin / Équipe de vérification) -----------------------

  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.VERIFICATION_TEAM)
  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateProductDto) {
    return this.service.create(user.sub, dto);
  }

  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.VERIFICATION_TEAM)
  @Get()
  findAll(@Query('statut') statut?: ProductStatus) {
    return this.service.findAllForAdmin(statut);
  }

  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.VERIFICATION_TEAM)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.VERIFICATION_TEAM)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.service.update(id, dto);
  }

  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.VERIFICATION_TEAM)
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateProductStatusDto,
  ) {
    return this.service.updateStatus(id, user.sub, dto);
  }
}
