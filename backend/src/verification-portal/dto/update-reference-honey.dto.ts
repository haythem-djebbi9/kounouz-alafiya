import { PartialType } from '@nestjs/swagger';
import { CreateReferenceHoneyDto } from './create-reference-honey.dto.js';

// Le code et l'état actif ne sont pas modifiables ici : le premier identifie
// l'étalon de façon définitive, le second passe par /activate et /deactivate.
export class UpdateReferenceHoneyDto extends PartialType(CreateReferenceHoneyDto) {}
