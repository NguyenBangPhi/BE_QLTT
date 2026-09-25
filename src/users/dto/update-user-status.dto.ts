import { IsIn, IsInt, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserStatusDto {
  @ApiProperty({ example: 1, description: '1: Hoạt động, 0: Khóa', enum: [0, 1] })
  @IsNotEmpty()
  @IsInt()
  @IsIn([0, 1])
  trangThai: number;
}
