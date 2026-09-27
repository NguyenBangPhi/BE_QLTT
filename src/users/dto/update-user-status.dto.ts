import { IsIn, IsInt, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserStatusDto {
  @ApiProperty({ example: 1, description: '1: Hoạt động, 0: Khóa', enum: [0, 1] })
  @IsNotEmpty({ message: 'Vui lòng chọn trạng thái' })
  @IsInt({ message: 'Trạng thái phải là số nguyên' })
  @IsIn([0, 1], { message: 'Trạng thái chỉ nhận giá trị 0 (khóa) hoặc 1 (hoạt động)' })
  trangThai: number;
}
