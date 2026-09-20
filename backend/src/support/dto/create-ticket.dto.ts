import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CreateTicketDto {
  @ApiProperty()
  @IsString()
  @MinLength(3)
  subject!: string;

  @ApiProperty()
  @IsString()
  @MinLength(5)
  message!: string;
}
