import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export enum ProductStatusTransition {
  PUBLIE = 'PUBLIE',
  RUPTURE = 'RUPTURE',
  SUSPENDU = 'SUSPENDU',
}

export class UpdateProductStatusDto {
  @ApiProperty({ enum: ProductStatusTransition })
  @IsEnum(ProductStatusTransition)
  statut!: ProductStatusTransition;
}
