import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateVerifiedBatchDto } from './create-verified-batch.dto.js';

// La vérification d'origine d'un lot ne change jamais : c'est elle qui fonde
// sa traçabilité. Seules ses caractéristiques commerciales sont modifiables.
export class UpdateBatchDto extends PartialType(
  OmitType(CreateVerifiedBatchDto, ['verificationId'] as const),
) {}
