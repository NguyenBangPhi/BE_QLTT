import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from '../database/database.service';
import * as crypto from 'crypto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly jwtService: JwtService
  ) {}

  async login(loginDto: LoginDto) {
    const passwordHash = crypto.createHash('sha256').update(loginDto.password).digest('hex');
    
    const users = await this.databaseService.callProcedureWithResult<any>(
      'sp_Login', 
      [loginDto.username, passwordHash]
    );

    if (!users || users.length === 0) {
      throw new UnauthorizedException('Tên đăng nhập hoặc mật khẩu không đúng, hoặc tài khoản đã bị khóa.');
    }

    const user = users[0];
    const payload = { 
      sub: user.MaNguoiDung, 
      username: user.TenDangNhap, 
      role: user.TenVaiTro,
      maSV: user.MaSV
    };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async getProfile(maNguoiDung: number) {
    const rows = await this.databaseService.query<any[]>(
      `SELECT nd.MaNguoiDung, nd.TenDangNhap, nd.HoTen, nd.Email, nd.TrangThai, nd.NgayTao,
              v.TenVaiTro,
              sv.MaSV, sv.Lop, sv.Khoa, sv.NgayCapThe, sv.NgayHetHanThe, sv.TrangThaiThe
       FROM NguoiDung nd
       JOIN VaiTro v ON v.MaVaiTro = nd.MaVaiTro
       LEFT JOIN SinhVien sv ON sv.MaNguoiDung = nd.MaNguoiDung
       WHERE nd.MaNguoiDung = ?`,
      [maNguoiDung],
    );

    if (rows.length === 0) {
      throw new UnauthorizedException('Tài khoản không còn tồn tại.');
    }

    return rows[0];
  }
}
