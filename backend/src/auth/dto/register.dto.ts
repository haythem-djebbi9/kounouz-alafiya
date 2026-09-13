import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

// Auto-inscription publique : réservée aux producteurs et consommateurs.
// Les comptes internes (Admin, Équipe de vérification, Agent terrain) sont
// créés par un administrateur via POST /auth/register-staff.
export enum SelfRegisterRole {
  PRODUCER = 'PRODUCER',
  CONSUMER = 'CONSUMER',
}

export class RegisterDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ enum: SelfRegisterRole })
  @IsEnum(SelfRegisterRole)
  role!: SelfRegisterRole;

  // Producteur : nom de l'exploitation. Requis si role = PRODUCER.
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  farmName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  location?: string;

  // Consommateur : pays.
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  country?: string;
}
