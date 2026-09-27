import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateConfigDto {
  @ApiProperty({ example: '14' })
  @IsNotEmpty({ message: 'Giá trị cấu hình không được để trống' })
  @IsString({ message: 'Giá trị cấu hình không hợp lệ' })
  // Cột CauHinh.GiaTri là VARCHAR(100)
  @MaxLength(100, { message: 'Giá trị cấu hình không được vượt quá 100 ký tự' })
  value: string;
}
