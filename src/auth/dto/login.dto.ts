import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin01', description: 'Tên đăng nhập' })
  @IsNotEmpty()
  @IsString()
  username: string;

  @ApiProperty({ example: '123456', description: 'Mật khẩu' })
  @IsNotEmpty()
  @IsString()
  password: string;
}
