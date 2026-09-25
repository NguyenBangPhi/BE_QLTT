import { IsInt, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateFineDto {
  @ApiProperty({ example: 10000, required: false })
  @IsOptional()
  @IsInt()
  tienPhat?: number;

  @ApiProperty({ example: 'Làm hỏng sách', required: false })
  @IsOptional()
  @IsString()
  ghiChu?: string;
}
