import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateQrCodeStatusDto {
  @ApiProperty()
  @IsBoolean()
  isActive!: boolean;
}
