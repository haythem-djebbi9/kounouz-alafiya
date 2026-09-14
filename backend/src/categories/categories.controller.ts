import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CategoriesService } from './categories.service.js';
import { CreateCategorieDto } from './dto/create-categorie.dto.js';
import { UpdateCategorieDto } from './dto/update-categorie.dto.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Public } from '../auth/decorators/public.decorator.js';

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly service: CategoriesService) {}

  // Catalogue public (marketplace) : catégories actives uniquement.
  @Public()
  @Get()
  findPublic() {
    return this.service.findPublic();
  }

  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.VERIFICATION_TEAM)
  @Get('admin')
  findAllForAdmin() {
    return this.service.findAllForAdmin();
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.VERIFICATION_TEAM)
  @Post()
  create(@Body() dto: CreateCategorieDto) {
    return this.service.create(dto);
  }

  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.VERIFICATION_TEAM)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCategorieDto) {
    return this.service.update(id, dto);
  }

  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.VERIFICATION_TEAM)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
