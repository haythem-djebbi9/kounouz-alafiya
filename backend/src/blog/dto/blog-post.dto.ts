import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, IsString, Matches, MaxLength, ValidateNested } from 'class-validator';
import { BLOG_CATEGORIES } from '../blog-text.js';

// Un texte par langue ; chaque classe fixe la longueur maximale du champ.
class LocalizedTitleDto {
  @IsOptional() @IsString() @MaxLength(200) ar?: string;
  @IsOptional() @IsString() @MaxLength(200) fr?: string;
  @IsOptional() @IsString() @MaxLength(200) en?: string;
}

class LocalizedExcerptDto {
  @IsOptional() @IsString() @MaxLength(500) ar?: string;
  @IsOptional() @IsString() @MaxLength(500) fr?: string;
  @IsOptional() @IsString() @MaxLength(500) en?: string;
}

class LocalizedContentDto {
  @IsOptional() @IsString() @MaxLength(40000) ar?: string;
  @IsOptional() @IsString() @MaxLength(40000) fr?: string;
  @IsOptional() @IsString() @MaxLength(40000) en?: string;
}

export class CreateBlogPostDto {
  @ApiProperty({ description: 'Titre par langue : { ar, fr, en }' })
  @ValidateNested()
  @Type(() => LocalizedTitleDto)
  title!: LocalizedTitleDto;

  @ApiProperty({ required: false, description: 'Chapô par langue' })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedExcerptDto)
  excerpt?: LocalizedExcerptDto;

  @ApiProperty({ required: false, description: 'Contenu par langue (## intertitre, - liste, > encadré, **gras**)' })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedContentDto)
  content?: LocalizedContentDto;

  @ApiProperty({ enum: BLOG_CATEGORIES })
  @IsIn(BLOG_CATEGORIES)
  category!: string;

  @ApiProperty({ required: false, description: 'Généré depuis le titre si absent' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: 'Adresse invalide : lettres minuscules, chiffres et tirets.' })
  slug?: string;

  @ApiProperty({ required: false, description: 'Image du site (/images/...) ou lien https' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Matches(/^(\/|https:\/\/)/, { message: "L'image doit être une adresse du site (/images/...) ou un lien https." })
  coverImage?: string;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @ApiProperty({ required: false, enum: ['DRAFT', 'PUBLISHED'] })
  @IsOptional()
  @IsIn(['DRAFT', 'PUBLISHED'])
  status?: 'DRAFT' | 'PUBLISHED';
}

export class UpdateBlogPostDto extends PartialType(CreateBlogPostDto) {}
