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

  // fn_CountBorrowedBooks có sẵn trong DB, gọi lại thay vì tự đếm bằng COUNT(*)
  private readonly studentSelect = `
    SELECT sv.MaSV, sv.MaNguoiDung, nd.TenDangNhap, nd.HoTen, nd.Email, nd.TrangThai,
           sv.Lop, sv.Khoa, sv.NgayCapThe, sv.NgayHetHanThe, sv.TrangThaiThe,
           fn_CountBorrowedBooks(sv.MaSV) AS SoSachDangMuon
    FROM SinhVien sv
    JOIN NguoiDung nd ON nd.MaNguoiDung = sv.MaNguoiDung`;

  async findAllStudents(keyword?: string, trangThaiThe?: number) {
    const conditions: string[] = [];
    const params: any[] = [];

    if (keyword) {
      conditions.push('(sv.MaSV LIKE ? OR nd.HoTen LIKE ? OR sv.Lop LIKE ?)');
      const like = `%${keyword}%`;
      params.push(like, like, like);
    }
    if (trangThaiThe !== undefined) {
      conditions.push('sv.TrangThaiThe = ?');
      params.push(trangThaiThe);
    }

    const where = conditions.length ? ` WHERE ${conditions.join(' AND ')}` : '';
    return this.db.query(`${this.studentSelect}${where} ORDER BY sv.MaSV`, params);
  }

  async findOneStudent(maSV: string) {
    const rows = await this.db.query<any[]>(
      `${this.studentSelect} WHERE sv.MaSV = ?`,
      [maSV],
    );
    if (rows.length === 0) throw new NotFoundException('Sinh viên không tồn tại');
    return rows[0];
  }

  async updateCardStatus(id: string, trangThaiThe: number) {
    const result = await this.db.query('UPDATE SinhVien SET TrangThaiThe = ? WHERE MaSV = ?', [trangThaiThe, id]);
    if ((result as any).affectedRows === 0) {
      throw new NotFoundException('Sinh viên không tồn tại');
    }
    return { message: 'Cập nhật thẻ thành công' };
  }
}
