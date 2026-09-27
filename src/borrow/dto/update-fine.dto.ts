import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateFineDto {
  @ApiProperty({ example: 10000, required: false })
  @IsOptional()
  @IsInt({ message: 'Tiền phạt phải là số nguyên' })
  @Min(0, { message: 'Tiền phạt không được âm' })
  tienPhat?: number;

  @ApiProperty({
    example: 'Làm hỏng sách',
    required: false,
    description: 'Ghi chú lưu vào PhieuMuon.GhiChu của phiếu chứa cuốn sách này',
  })
  @IsOptional()
  @IsString({ message: 'Ghi chú không hợp lệ' })
  // Cột PhieuMuon.GhiChu là VARCHAR(255), vượt quá sẽ bị MySQL cắt hoặc báo lỗi
  @MaxLength(255, { message: 'Ghi chú không được vượt quá 255 ký tự' })
  ghiChu?: string;
}
