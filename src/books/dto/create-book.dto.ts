import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBookDto {
  @ApiProperty({ example: '978-0123456789' })
  @IsNotEmpty()
  @IsString()
  ISBN: string;

  @ApiProperty({ example: 'Tên sách' })
  @IsNotEmpty()
  @IsString()
  TenSach: string;

  @ApiProperty({ example: 1 })
  @IsNotEmpty()
  @IsInt()
  MaTacGia: number;

  @ApiProperty({ example: 1 })
  @IsNotEmpty()
  @IsInt()
  MaTheLoai: number;

  @ApiProperty({ example: 'NXB Giáo Dục' })
  @IsOptional()
  @IsString()
  NhaXuatBan: string;

  @ApiProperty({ example: 2024 })
  @IsOptional()
  @IsInt()
  NamXuatBan: number;

  @ApiProperty({ example: 10 })
  @IsNotEmpty()
  @IsInt()
  @Min(0)
  SoLuongTong: number;
}
