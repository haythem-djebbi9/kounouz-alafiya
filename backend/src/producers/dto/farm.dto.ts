import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/** Rucher déclaré par le producteur (ERD : Farm). */
export class CreateFarmDto {
  @ApiProperty({ example: 'Rucher du Djebel Zaghouan' })
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name!: string;

  @ApiPropertyOptional({ example: 'Zaghouan' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  governorate?: string;

  @ApiPropertyOptional({ example: 'Zriba' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  delegation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(240)
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsLatitude()
  latitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsLongitude()
  longitude?: number;

  @ApiPropertyOptional({ example: 60 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  hivesCount?: number;

  @ApiPropertyOptional({ type: [String], example: ['Thym', 'Romarin'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  mainFlora?: string[];

  @ApiPropertyOptional({ example: 'Sédentaire' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  beekeepingMethod?: string;
}

export class UpdateFarmDto extends PartialType(CreateFarmDto) {
  @ApiPropertyOptional({ description: 'Désigne ce rucher comme rucher principal.' })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @ApiPropertyOptional({ description: 'Un rucher inactif ne peut plus être choisi pour une demande.' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
