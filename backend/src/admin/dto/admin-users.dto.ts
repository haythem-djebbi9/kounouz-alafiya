import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PageQueryDto } from '../admin-common.js';

// Rôles internes gérés depuis la console : producteurs et clients disposent
// de leur propre parcours d'inscription.
export const STAFF_ROLES = [Role.ADMIN, Role.VERIFICATION_TEAM, Role.FIELD_AGENT] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export const LAST_LOGIN_FILTERS = ['LAST_7_DAYS', 'LAST_30_DAYS', 'OVER_30_DAYS', 'NEVER'] as const;

export class ListUsersQueryDto extends PageQueryDto {
  @ApiProperty({ required: false, enum: Role })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiProperty({ required: false, enum: ['ACTIVE', 'INACTIVE'] })
  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status?: 'ACTIVE' | 'INACTIVE';

  @ApiProperty({ required: false, enum: LAST_LOGIN_FILTERS })
  @IsOptional()
  @IsIn(LAST_LOGIN_FILTERS)
  lastLogin?: (typeof LAST_LOGIN_FILTERS)[number];

  @ApiProperty({ required: false, enum: ['NAME', 'RECENT', 'LAST_LOGIN'] })
  @IsOptional()
  @IsIn(['NAME', 'RECENT', 'LAST_LOGIN'])
  sort?: 'NAME' | 'RECENT' | 'LAST_LOGIN';
}

export class CreateUserDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @ApiProperty({ enum: STAFF_ROLES })
  @IsIn(STAFF_ROLES)
  role!: StaffRole;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  location?: string;
}

export class UpdateUserDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @ApiProperty({ required: false, enum: STAFF_ROLES })
  @IsOptional()
  @IsIn(STAFF_ROLES)
  role?: StaffRole;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  location?: string;
}

export class SetUserStatusDto {
  @ApiProperty()
  @IsBoolean()
  isActive!: boolean;
}

export class ResetPasswordDto {
  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}
