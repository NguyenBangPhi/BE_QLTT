import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class UsersService {
  constructor(private readonly db: DatabaseService) {}

  async findAll() {
    return this.db.query('SELECT n.MaNguoiDung, n.TenDangNhap, n.HoTen, n.Email, n.TrangThai, n.NgayTao, v.TenVaiTro FROM NguoiDung n JOIN VaiTro v ON n.MaVaiTro = v.MaVaiTro');
  }

  async updateUserStatus(id: number, trangThai: number) {
    const result = await this.db.query('UPDATE NguoiDung SET TrangThai = ? WHERE MaNguoiDung = ?', [trangThai, id]);
    if ((result as any).affectedRows === 0) {
      throw new NotFoundException('Người dùng không tồn tại');
    }
    return { message: 'Cập nhật trạng thái thành công' };
  }

  async updateCardStatus(id: string, trangThaiThe: number) {
    const result = await this.db.query('UPDATE SinhVien SET TrangThaiThe = ? WHERE MaSV = ?', [trangThaiThe, id]);
    if ((result as any).affectedRows === 0) {
      throw new NotFoundException('Sinh viên không tồn tại');
    }
    return { message: 'Cập nhật thẻ thành công' };
  }
}
