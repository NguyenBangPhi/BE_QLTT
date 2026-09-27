import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin01', description: 'Tên đăng nhập' })
  @IsNotEmpty({ message: 'Vui lòng nhập tên đăng nhập' })
  @IsString({ message: 'Tên đăng nhập không hợp lệ' })
  username: string;

  @ApiProperty({ example: '123456', description: 'Mật khẩu' })
  @IsNotEmpty({ message: 'Vui lòng nhập mật khẩu' })
  @IsString({ message: 'Mật khẩu không hợp lệ' })
  password: string;
}
