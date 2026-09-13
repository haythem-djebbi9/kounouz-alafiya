import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';

// Rôles internes : créés uniquement par un Admin (jamais par auto-inscription).
export enum StaffRole {
  ADMIN = 'ADMIN',
  VERIFICATION_TEAM = 'VERIFICATION_TEAM',
  FIELD_AGENT = 'FIELD_AGENT',
}

export class RegisterStaffDto {
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

  @ApiProperty({ enum: StaffRole })
  @IsEnum(StaffRole)
  role!: StaffRole;
}
