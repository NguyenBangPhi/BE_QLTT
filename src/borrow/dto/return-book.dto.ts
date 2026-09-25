import { IsInt, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReturnBookDto {
  @ApiProperty({ example: 1 })
  @IsNotEmpty()
  @IsInt()
  maCTPM: number;
}
