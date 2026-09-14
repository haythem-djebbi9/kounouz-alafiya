import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt, IsNumber, IsOptional, IsPositive, IsString, Min } from 'class-validator';

export class CreateProductDto {
  @ApiProperty()
  @IsString()
  categorieId!: string;

  @ApiProperty()
  @IsString()
  nom!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  prix!: number;

  @ApiProperty({ required: false, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiProperty({ required: false, example: 'Premium' })
  @IsOptional()
  @IsString()
  gamme?: string;

  @ApiProperty({ required: false, description: 'Lot certifié à rattacher (requis pour publier)' })
  @IsOptional()
  @IsString()
  batchId?: string;
}
