import { IsArray, IsDateString, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BorrowBookDto {
  @ApiProperty({ example: 'SV001' })
  @IsNotEmpty()
  @IsString()
  maSV: string;

  @ApiProperty({ example: [1, 2, 3] })
  @IsNotEmpty()
  @IsArray()
  jsonSach: number[];

  @ApiProperty({ example: '2026-10-10' })
  @IsNotEmpty()
  @IsDateString()
  ngayHenTra: string;
}
