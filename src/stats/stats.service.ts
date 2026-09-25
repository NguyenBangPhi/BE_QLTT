import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class StatsService {
  constructor(private readonly db: DatabaseService) {}

  async getBorrowing() {
    return this.db.query('SELECT * FROM vw_SachDangMuon');
  }

  async getOverdue() {
    return this.db.query('SELECT * FROM vw_SachQuaHan');
  }

  async getConfigs() {
    return this.db.query('SELECT * FROM CauHinh');
  }

  async updateConfig(key: string, value: string) {
    const result = await this.db.query(
      'UPDATE CauHinh SET GiaTri = ? WHERE TenCauHinh = ?',
      [value, key]
    );
    if ((result as any).affectedRows === 0) throw new NotFoundException('Cấu hình không tồn tại');
    return { message: 'Cập nhật cấu hình thành công' };
  }
}
