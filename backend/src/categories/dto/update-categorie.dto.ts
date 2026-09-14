import { PartialType } from '@nestjs/swagger';
import { CreateCategorieDto } from './create-categorie.dto.js';

export class UpdateCategorieDto extends PartialType(CreateCategorieDto) {}
