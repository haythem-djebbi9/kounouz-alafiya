import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsPositive, IsString } from 'class-validator';

export class CreateBatchDto {
  @ApiProperty({ description: 'Vérification VERIFIED à partir de laquelle créer le lot' })
  @IsString()
  verificationId!: string;

  @ApiProperty({ description: 'Quantité du lot en kg' })
  @IsNumber()
  @IsPositive()
  quantityKg!: number;

  @ApiProperty()
  @IsDateString()
  productionDate!: string;
}
