import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Length } from 'class-validator';

// Pas de canal e-mail disponible pour envoyer un lien de confirmation : le
// changement d'adresse est protégé par le mot de passe actuel.
export class ChangeEmailDto {
  @ApiProperty()
  @IsEmail()
  newEmail!: string;

  @ApiProperty()
  @IsString()
  currentPassword!: string;
}

export class TwoFactorCodeDto {
  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(6, 8)
  code!: string;
}

export class DisableTwoFactorDto {
  @ApiProperty()
  @IsString()
  currentPassword!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(6, 8)
  code!: string;
}

export class TwoFactorLoginDto {
  @ApiProperty()
  @IsString()
  twoFactorToken!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(6, 8)
  code!: string;
}

export class DeleteAccountDto {
  @ApiProperty()
  @IsString()
  currentPassword!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}
