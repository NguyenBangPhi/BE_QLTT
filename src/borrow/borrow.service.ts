import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { BorrowBookDto } from './dto/borrow-book.dto';
import { ReturnBookDto } from './dto/return-book.dto';
import { UpdateFineDto } from './dto/update-fine.dto';

@Injectable()
export class BorrowService {
  constructor(private readonly db: DatabaseService) {}

  async borrowBook(maThuThu: number, dto: BorrowBookDto) {
    // sp_BorrowBook nhận thẳng p_NgayHenTra mà không kiểm tra, nên phiếu lập với ngày
    // quá khứ sẽ quá hạn ngay lúc tạo và fn_CalculateFine sinh ra tiền phạt vô lý.
    // Đây là kiểm tra dữ liệu đầu vào, không phải viết lại nghiệp vụ của SP.
    const homNay = new Date().toLocaleDateString('en-CA'); // 'YYYY-MM-DD' theo giờ máy chủ
    if (dto.ngayHenTra <= homNay) {
      throw new BadRequestException('Ngày hẹn trả phải sau ngày hôm nay.');
    }

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
    if (dto.tienPhat === undefined && dto.ghiChu === undefined) {
      return { message: 'Không có thông tin cần cập nhật' };
    }

    const conn = await this.db.getConnection();
    try {
      // Kiểm tra tồn tại trước, không dựa vào affectedRows: MySQL trả 0 khi giá trị
      // mới trùng giá trị cũ, sẽ báo nhầm là không tìm thấy bản ghi.
      const [rows] = await conn.query<any[]>(
        'SELECT MaCTPM FROM ChiTietPhieuMuon WHERE MaCTPM = ?',
        [id],
      );
      if (rows.length === 0) {
        throw new NotFoundException('Chi tiết phiếu mượn không tồn tại');
      }

      await conn.beginTransaction();
      try {
        // Trigger trg_PreventDuplicateReturn chỉ cho sửa TienPhat trên dòng đã trả
        if (dto.tienPhat !== undefined) {
          await conn.query('UPDATE ChiTietPhieuMuon SET TienPhat = ? WHERE MaCTPM = ?', [
            dto.tienPhat,
            id,
          ]);
        }
        // GhiChu nằm ở bảng PhieuMuon (cấp phiếu), ChiTietPhieuMuon không có cột này
        if (dto.ghiChu !== undefined) {
          await conn.query(
            `UPDATE PhieuMuon pm
             JOIN ChiTietPhieuMuon ct ON ct.MaPhieuMuon = pm.MaPhieuMuon
             SET pm.GhiChu = ?
             WHERE ct.MaCTPM = ?`,
            [dto.ghiChu, id],
          );
        }
        await conn.commit();
      } catch (err) {
        await conn.rollback();
        throw err;
      }

      return { message: 'Cập nhật tiền phạt thành công' };
    } finally {
      conn.release();
    }
  }

  async findAll(filter: {
    maSV?: string;
    keyword?: string;
    trangThai?: number;
    tuNgay?: string;
    denNgay?: string;
    page: number;
    limit: number;
  }) {
    const conditions: string[] = [];
    const params: any[] = [];

    if (filter.maSV) {
      conditions.push('pm.MaSV = ?');
      params.push(filter.maSV);
    }
    if (filter.keyword) {
      conditions.push('(nd.HoTen LIKE ? OR pm.MaSV LIKE ? OR s.TenSach LIKE ? OR s.ISBN LIKE ?)');
      const like = `%${filter.keyword}%`;
      params.push(like, like, like, like);
    }
    if (filter.trangThai !== undefined) {
      conditions.push('ct.TrangThai = ?');
      params.push(filter.trangThai);
    }
    if (filter.tuNgay) {
      conditions.push('pm.NgayMuon >= ?');
      params.push(filter.tuNgay);
    }
    if (filter.denNgay) {
      conditions.push('pm.NgayMuon <= ?');
      params.push(filter.denNgay);
    }
    const where = conditions.length ? ` WHERE ${conditions.join(' AND ')}` : '';

    const from = `
      FROM ChiTietPhieuMuon ct
      JOIN PhieuMuon pm ON pm.MaPhieuMuon = ct.MaPhieuMuon
      JOIN Sach s ON s.MaSach = ct.MaSach
      JOIN SinhVien sv ON sv.MaSV = pm.MaSV
      JOIN NguoiDung nd ON nd.MaNguoiDung = sv.MaNguoiDung
      JOIN NguoiDung tt ON tt.MaNguoiDung = pm.MaThuThu${where}`;

    const countRows = await this.db.query<any[]>(`SELECT COUNT(*) AS total ${from}`, params);
    const total = Number(countRows[0].total);

    const offset = (filter.page - 1) * filter.limit;
    const data = await this.db.query(
      `SELECT ct.MaCTPM, ct.MaPhieuMuon, ct.MaSach, ct.NgayHenTra, ct.NgayTraThucTe,
              ct.TienPhat, ct.TrangThai,
              pm.MaSV, pm.NgayMuon, pm.GhiChu, pm.MaThuThu,
              s.ISBN, s.TenSach,
              nd.HoTen AS TenSinhVien,
              tt.HoTen AS TenThuThu,
              GREATEST(DATEDIFF(IFNULL(ct.NgayTraThucTe, CURDATE()), ct.NgayHenTra), 0) AS SoNgayQuaHan
       ${from}
       ORDER BY pm.NgayMuon DESC, ct.MaCTPM DESC
       LIMIT ? OFFSET ?`,
      [...params, filter.limit, offset],
    );

    return { data, total, page: filter.page, limit: filter.limit };
  }

  async getBorrowHistory(maSV: string) {
    return this.db.callProcedureWithResult<any>('sp_GetBorrowHistory', [maSV]);
  }
}
