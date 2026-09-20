import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateBatchProductDto } from './create-batch-product.dto.js';

// Le lot d'origine d'un produit ne change jamais : c'est le lien de
// traçabilité qui fonde la mention « Kounouz Verified ».
export class UpdateBatchProductDto extends PartialType(
  OmitType(CreateBatchProductDto, ['batchId'] as const),
) {}
