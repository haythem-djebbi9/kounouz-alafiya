import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsISO8601, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class SavePackagingDto {
  @ApiProperty({ example: 'Pot en verre' })
  @IsString()
  @MaxLength(120)
  packageType!: string;

  @ApiProperty({ description: 'Format de référence du lot.', example: '500 g' })
  @IsString()
  @MaxLength(60)
  size!: string;

  @ApiProperty({ description: 'Date de conditionnement (ISO 8601).' })
  @IsISO8601()
  productionDate!: string;

  @ApiPropertyOptional({ example: 'Kounouz Standard' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  packagingLine?: string;

  @ApiPropertyOptional({ description: "Nombre d'unités visé pour le lot." })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  unitsPlanned?: number;

  @ApiPropertyOptional({ description: 'Date de péremption (ISO 8601).' })
  @IsOptional()
  @IsISO8601()
  expiryDate?: string;

  @ApiPropertyOptional({ description: "URL de la maquette d'étiquette." })
  @IsOptional()
  @IsString()
  labelDesign?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
