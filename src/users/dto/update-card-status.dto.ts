import { IsIn, IsInt, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCardStatusDto {
  @ApiProperty({ example: 1, description: '1: ACTIVE, 0: LOCKED', enum: [0, 1] })
  @IsNotEmpty()
  @IsInt()
  @IsIn([0, 1])
  trangThaiThe: number;
}
