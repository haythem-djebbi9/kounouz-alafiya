import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateCategorieDto {
  @ApiProperty()
  @IsString()
  nom!: string;

  @ApiProperty({ required: false, description: 'Généré depuis le nom si absent' })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiProperty({ required: false, default: 0 })
  @IsOptional()
  @IsInt()
  ordre?: number;

  @ApiProperty({ required: false, description: 'Catégorie parente pour une sous-catégorie' })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  actif?: boolean;
}
