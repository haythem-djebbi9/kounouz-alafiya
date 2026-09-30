import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus, SalesChannel } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class OrderItemInputDto {
  @ApiProperty()
  @IsString()
  productId!: string;

  // Format vendu (SKU). Absent : SKU par défaut du produit (anciens paniers).
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  variantId?: string;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  quantity!: number;
}

export class CreateOrderDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  customerName!: string;

  @ApiProperty({ example: '+216 22 123 456' })
  @Matches(/^\+?[0-9\s-]{8,20}$/, { message: 'Numéro de téléphone invalide.' })
  customerPhone!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  customerEmail?: string;

  @ApiProperty()
  @IsString()
  @MinLength(5)
  @MaxLength(300)
  shippingAddress!: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  city!: string;

  @ApiProperty({ type: [OrderItemInputDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => OrderItemInputDto)
  items!: OrderItemInputDto[];
}

// Commandes saisies par l'équipe Kounouz pour les canaux hors boutique en
// ligne (revendeurs partenaires, marketplaces tierces).
export class CreateStaffOrderDto extends CreateOrderDto {
  @ApiProperty({ enum: SalesChannel })
  @IsEnum(SalesChannel)
  channel!: SalesChannel;
}

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: OrderStatus })
  @IsEnum(OrderStatus)
  status!: OrderStatus;
}

export class PaySettlementDto {
  @ApiProperty()
  @IsString()
  producerId!: string;

  @ApiProperty({ example: '2026-08' })
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'Période invalide (format AAAA-MM).' })
  period!: string;

  @ApiProperty({ required: false, description: 'Référence du virement' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  reference?: string;
}

export class UpdateCommissionDto {
  @ApiProperty({ example: 0.2, description: 'Taux entre 0 et 0,5 (0,2 = 20 %)' })
  @IsNumber({ maxDecimalPlaces: 4 }, { message: 'Le taux doit être un nombre (0,2 = 20 %).' })
  @Min(0, { message: 'Le taux ne peut pas être négatif.' })
  @Max(0.5, { message: 'Le taux ne peut pas dépasser 50 %.' })
  rate!: number;

  @ApiProperty({ required: false, description: 'Motif du changement, gardé dans le journal' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;
}
