import { IsInt, IsNotEmpty, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReturnBookDto {
  @ApiProperty({ example: 1, description: 'MaCTPM của cuốn sách cần trả' })
  @IsNotEmpty({ message: 'Vui lòng chọn cuốn sách cần trả' })
  @IsInt({ message: 'Mã chi tiết phiếu mượn phải là số nguyên' })
  @IsPositive({ message: 'Mã chi tiết phiếu mượn không hợp lệ' })
  maCTPM: number;
}
