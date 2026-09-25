import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateAuthorDto } from './dto/create-author.dto';

@Injectable()
export class AuthorsService {
  constructor(private readonly db: DatabaseService) {}

  async findAll() {
    return this.db.query('SELECT * FROM TacGia');
  }

  async findOne(id: number) {
    const authors = await this.db.query<any[]>('SELECT * FROM TacGia WHERE MaTacGia = ?', [id]);
    if (authors.length === 0) throw new NotFoundException('Tác giả không tồn tại');
    return authors[0];
  }

  async create(dto: CreateAuthorDto) {
    const result = await this.db.query('INSERT INTO TacGia (TenTacGia) VALUES (?)', [dto.TenTacGia]);
    return { id: (result as any).insertId, ...dto };
  }

  async update(id: number, dto: CreateAuthorDto) {
    const result = await this.db.query('UPDATE TacGia SET TenTacGia = ? WHERE MaTacGia = ?', [dto.TenTacGia, id]);
    if ((result as any).affectedRows === 0) throw new NotFoundException('Tác giả không tồn tại');
    return this.findOne(id);
  }

  async remove(id: number) {
    const result = await this.db.query('DELETE FROM TacGia WHERE MaTacGia = ?', [id]);
    if ((result as any).affectedRows === 0) throw new NotFoundException('Tác giả không tồn tại');
    return { message: 'Xóa thành công' };
  }
}
