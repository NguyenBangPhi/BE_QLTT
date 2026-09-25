import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';

@Injectable()
export class BooksService {
  constructor(private readonly db: DatabaseService) {}

  async search(keyword?: string, maTacGia?: number, maTheLoai?: number) {
    return this.db.callProcedureWithResult<any>(
      'sp_SearchBooks', 
      [keyword || null, maTacGia || null, maTheLoai || null]
    );
  }

  async findOne(id: number) {
    const books = await this.db.query<any[]>(
      'SELECT s.*, t.TenTacGia, tl.TenTheLoai FROM Sach s JOIN TacGia t ON s.MaTacGia = t.MaTacGia JOIN TheLoai tl ON s.MaTheLoai = tl.MaTheLoai WHERE s.MaSach = ?',
      [id]
    );
    if (books.length === 0) throw new NotFoundException('Sách không tồn tại');
    return books[0];
  }

  async create(dto: CreateBookDto) {
    await this.db.callProcedure('sp_AddBook', [
      dto.ISBN, dto.TenSach, dto.MaTacGia, dto.MaTheLoai, 
      dto.NhaXuatBan || null, dto.NamXuatBan || null, dto.SoLuongTong
    ]);
    return { message: 'Thêm sách thành công' };
  }

  async update(id: number, dto: UpdateBookDto, username: string) {
    const conn = await this.db.getConnection();
    try {
      await conn.query('SET @app_user = ?', [username]);
      
      const fields = [];
      const values = [];
      for (const [key, value] of Object.entries(dto)) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
      
      if (fields.length === 0) return { message: 'Không có thông tin cần cập nhật' };
      
      values.push(id);
      const [result] = await conn.query(
        `UPDATE Sach SET ${fields.join(', ')} WHERE MaSach = ?`, 
        values
      );
      
      if ((result as any).affectedRows === 0) throw new NotFoundException('Sách không tồn tại');
      return { message: 'Cập nhật sách thành công' };
    } finally {
      conn.release();
    }
  }

  async remove(id: number, username: string) {
    const conn = await this.db.getConnection();
    try {
      await conn.query('SET @app_user = ?', [username]);
      const [result] = await conn.query('DELETE FROM Sach WHERE MaSach = ?', [id]);
      if ((result as any).affectedRows === 0) throw new NotFoundException('Sách không tồn tại');
      return { message: 'Xóa sách thành công' };
    } finally {
      conn.release();
    }
  }
}
