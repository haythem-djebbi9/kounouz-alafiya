import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsDateString, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class CreateSampleDto {
  @ApiProperty()
  @IsString()
  requestId!: string;

  @ApiProperty()
  @IsDateString()
  collectionDate!: string;

  @ApiProperty()
  @IsString()
  location!: string;

  @ApiProperty({ description: 'Quantité prélevée en kg' })
  @IsNumber()
  @IsPositive()
  quantity!: number;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos?: string[];
}
