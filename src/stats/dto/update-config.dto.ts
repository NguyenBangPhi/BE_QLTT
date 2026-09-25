import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateConfigDto {
  @ApiProperty({ example: '14' })
  @IsNotEmpty()
  @IsString()
  value: string;
}
