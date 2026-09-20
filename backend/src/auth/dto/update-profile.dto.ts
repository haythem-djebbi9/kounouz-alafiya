import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

// Nom et langue uniquement : l'e-mail passe par PATCH /auth/change-email
// (protégé par mot de passe) et les coordonnées de règlement du producteur
// par PATCH /producers/me.
export class UpdateProfileDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiProperty({ required: false, enum: ['ar', 'fr', 'en'] })
  @IsOptional()
  @IsIn(['ar', 'fr', 'en'])
  language?: string;
}
