import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateGenreDto } from './dto/create-genre.dto';

@Injectable()
export class GenresService {
  constructor(private readonly db: DatabaseService) {}

  async findAll() {
    return this.db.query('SELECT * FROM TheLoai');
  }

  async findOne(id: number) {
    const genres = await this.db.query<any[]>('SELECT * FROM TheLoai WHERE MaTheLoai = ?', [id]);
    if (genres.length === 0) throw new NotFoundException('Thể loại không tồn tại');
    return genres[0];
  }

  async create(dto: CreateGenreDto) {
    const result = await this.db.query('INSERT INTO TheLoai (TenTheLoai) VALUES (?)', [dto.TenTheLoai]);
    return { id: (result as any).insertId, ...dto };
  }

  async update(id: number, dto: CreateGenreDto) {
    const result = await this.db.query('UPDATE TheLoai SET TenTheLoai = ? WHERE MaTheLoai = ?', [dto.TenTheLoai, id]);
    if ((result as any).affectedRows === 0) throw new NotFoundException('Thể loại không tồn tại');
    return this.findOne(id);
  }

  async remove(id: number) {
    const result = await this.db.query('DELETE FROM TheLoai WHERE MaTheLoai = ?', [id]);
    if ((result as any).affectedRows === 0) throw new NotFoundException('Thể loại không tồn tại');
    return { message: 'Xóa thành công' };
  }
}
