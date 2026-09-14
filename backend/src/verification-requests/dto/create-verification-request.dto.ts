import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class CreateVerificationRequestDto {
  @ApiProperty({ description: 'Ex: Miel de Jujubier (Sedra)' })
  @IsString()
  honeyType!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsString()
  collectionLocation!: string;

  @ApiProperty({ description: 'Quantité en kg' })
  @IsNumber()
  @IsPositive()
  quantity!: number;
}
