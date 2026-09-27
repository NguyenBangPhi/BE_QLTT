import { IsIn, IsInt, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCardStatusDto {
  @ApiProperty({ example: 1, description: '1: ACTIVE, 0: LOCKED', enum: [0, 1] })
  @IsNotEmpty({ message: 'Vui lòng chọn trạng thái thẻ' })
  @IsInt({ message: 'Trạng thái thẻ phải là số nguyên' })
  @IsIn([0, 1], { message: 'Trạng thái thẻ chỉ nhận giá trị 0 (khóa) hoặc 1 (hoạt động)' })
  trangThaiThe: number;
}
