import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { BorrowBookDto } from './dto/borrow-book.dto';
import { ReturnBookDto } from './dto/return-book.dto';
import { UpdateFineDto } from './dto/update-fine.dto';

@Injectable()
export class BorrowService {
  constructor(private readonly db: DatabaseService) {}

  async borrowBook(maThuThu: number, dto: BorrowBookDto) {
    await this.db.callProcedure('sp_BorrowBook', [
      dto.maSV, maThuThu, JSON.stringify(dto.jsonSach), dto.ngayHenTra
    ]);
    return { message: 'Mượn sách thành công' };
  }

  async returnBook(dto: ReturnBookDto) {
    await this.db.callProcedure('sp_ReturnBook', [dto.maCTPM]);
    return { message: 'Trả sách thành công' };
  }

  async updateFine(id: number, dto: UpdateFineDto) {
    // Only update TienPhat because of trigger
    const fields = [];
    const values = [];
    
    if (dto.tienPhat !== undefined) {
      fields.push('TienPhat = ?');
      values.push(dto.tienPhat);
    }
    
    if (fields.length === 0) return { message: 'Không có thông tin cần cập nhật' };
    
    values.push(id);
    const result = await this.db.query(
      `UPDATE ChiTietPhieuMuon SET ${fields.join(', ')} WHERE MaCTPM = ?`,
      values
    );
    
    if ((result as any).affectedRows === 0) throw new NotFoundException('Chi tiết phiếu mượn không tồn tại');
    return { message: 'Cập nhật tiền phạt thành công' };
  }

  async getBorrowHistory(maSV: string) {
    return this.db.callProcedureWithResult<any>('sp_GetBorrowHistory', [maSV]);
  }
}
