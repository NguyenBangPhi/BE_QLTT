import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAuthorDto {
  @ApiProperty({ example: 'Nam Cao', description: 'Tên tác giả' })
  @IsNotEmpty()
  @IsString()
  TenTacGia: string;
}
