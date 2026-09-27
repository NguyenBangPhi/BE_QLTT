import { ArrayNotEmpty, IsArray, IsDateString, IsInt, IsNotEmpty, IsPositive, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BorrowBookDto {
  @ApiProperty({ example: 'SV001' })
  @IsNotEmpty({ message: 'Vui lòng chọn sinh viên' })
  @IsString({ message: 'Mã sinh viên không hợp lệ' })
  maSV: string;

  @ApiProperty({ example: [1, 2, 3], description: 'Danh sách MaSach, phải có ít nhất một cuốn' })
  @IsArray({ message: 'Danh sách sách không hợp lệ' })
  // Không có ràng buộc này thì sp_BorrowBook vẫn chạy và tạo ra một phiếu mượn rỗng,
  // không gắn với cuốn sách nào.
  @ArrayNotEmpty({ message: 'Vui lòng chọn ít nhất một cuốn sách' })
  @IsInt({ each: true, message: 'Mã sách phải là số nguyên' })
  @IsPositive({ each: true, message: 'Mã sách không hợp lệ' })
  jsonSach: number[];

  @ApiProperty({ example: '2026-10-10', description: 'Phải là một ngày trong tương lai' })
  @IsNotEmpty({ message: 'Vui lòng chọn ngày hẹn trả' })
  @IsDateString({}, { message: 'Ngày hẹn trả không đúng định dạng YYYY-MM-DD' })
  ngayHenTra: string;
}
