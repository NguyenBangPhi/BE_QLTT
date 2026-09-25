import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateGenreDto {
  @ApiProperty({ example: 'Văn học', description: 'Tên thể loại' })
  @IsNotEmpty()
  @IsString()
  TenTheLoai: string;
}
