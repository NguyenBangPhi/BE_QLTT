import { IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/** Giới hạn độ dài lấy đúng theo khai báo cột trong DA-Schema.sql để MySQL không cắt chuỗi */
export class CreateBookDto {
  @ApiProperty({ example: '978-0123456789' })
  @IsNotEmpty({ message: 'Vui lòng nhập mã ISBN' })
  @IsString({ message: 'Mã ISBN không hợp lệ' })
  @MaxLength(20, { message: 'Mã ISBN không được vượt quá 20 ký tự' })
  ISBN: string;

  @ApiProperty({ example: 'Tên sách' })
  @IsNotEmpty({ message: 'Vui lòng nhập tên sách' })
  @IsString({ message: 'Tên sách không hợp lệ' })
  @MaxLength(255, { message: 'Tên sách không được vượt quá 255 ký tự' })
  TenSach: string;

  @ApiProperty({ example: 1 })
  @IsNotEmpty({ message: 'Vui lòng chọn tác giả' })
  @IsInt({ message: 'Tác giả không hợp lệ' })
  MaTacGia: number;

  @ApiProperty({ example: 1 })
  @IsNotEmpty({ message: 'Vui lòng chọn thể loại' })
  @IsInt({ message: 'Thể loại không hợp lệ' })
  MaTheLoai: number;

  @ApiProperty({ example: 'NXB Giáo Dục', required: false })
  @IsOptional()
  @IsString({ message: 'Nhà xuất bản không hợp lệ' })
  @MaxLength(100, { message: 'Tên nhà xuất bản không được vượt quá 100 ký tự' })
  NhaXuatBan: string;

  @ApiProperty({ example: 2024, required: false })
  @IsOptional()
  @IsInt({ message: 'Năm xuất bản phải là số nguyên' })
  @Min(1000, { message: 'Năm xuất bản không hợp lệ' })
  @Max(2200, { message: 'Năm xuất bản không hợp lệ' })
  NamXuatBan: number;

  @ApiProperty({ example: 10 })
  @IsNotEmpty({ message: 'Vui lòng nhập số lượng' })
  @IsInt({ message: 'Số lượng phải là số nguyên' })
  @Min(0, { message: 'Số lượng không được âm' })
  SoLuongTong: number;
}
