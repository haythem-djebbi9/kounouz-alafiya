import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CollectionMethod } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class RegisterSampleDto {
  @ApiProperty()
  @IsUUID()
  requestId!: string;

  @ApiProperty({ description: 'Date de collecte / réception (ISO 8601).' })
  @IsISO8601()
  collectionDate!: string;

  @ApiProperty({ enum: CollectionMethod })
  @IsEnum(CollectionMethod)
  collectionMethod!: CollectionMethod;

  @ApiProperty({ description: 'Quantité en kilogrammes.' })
  @Type(() => Number)
  @IsNumber()
  @Min(0.001)
  quantity!: number;

  @ApiPropertyOptional({ description: 'Par défaut, le lieu de collecte de la demande.' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
