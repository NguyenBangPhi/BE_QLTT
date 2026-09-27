import { ExceptionFilter, Catch, ArgumentsHost, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';

/**
 * Tên ràng buộc trong database → câu thông báo cho người dùng cuối.
 *
 * MySQL chỉ trả về câu tiếng Anh kèm tên constraint, ví dụ:
 *   "Cannot delete or update a parent row: a foreign key constraint fails
 *    (`QuanLyThuVien`.`Sach`, CONSTRAINT `fk_sach_tacgia` FOREIGN KEY ...)"
 * Nếu hiển thị nguyên văn thì người dùng không hiểu chuyện gì đang xảy ra, nên phải
 * tra ngược tên constraint để biết chính xác dữ liệu nào đang chặn thao tác.
 */
const FOREIGN_KEY_MESSAGES: Record<string, string> = {
  fk_sach_tacgia: 'Không thể xóa tác giả này vì vẫn còn sách thuộc về tác giả.',
  fk_sach_theloai: 'Không thể xóa thể loại này vì vẫn còn sách thuộc thể loại.',
  fk_ctpm_sach: 'Không thể xóa sách này vì đã có trong lịch sử mượn trả.',
  fk_ctpm_phieumuon: 'Không thể xóa phiếu mượn này vì vẫn còn chi tiết sách bên trong.',
  fk_phieumuon_sv: 'Không thể xóa sinh viên này vì đã có phiếu mượn.',
  fk_phieumuon_thuthu: 'Không thể xóa người dùng này vì đã từng lập phiếu mượn.',
  fk_thongbao_sv: 'Không thể xóa sinh viên này vì vẫn còn thông báo.',
  fk_thongbao_ctpm: 'Không thể xóa chi tiết phiếu mượn này vì vẫn còn thông báo liên quan.',
  fk_sinhvien_nguoidung: 'Không thể xóa người dùng này vì đang gắn với một sinh viên.',
  fk_nguoidung_vaitro: 'Không thể xóa vai trò này vì vẫn còn người dùng sử dụng.',
};

const UNIQUE_KEY_MESSAGES: Record<string, string> = {
  uq_sach_isbn: 'Mã ISBN này đã tồn tại trong hệ thống.',
  uq_theloai_ten: 'Tên thể loại này đã tồn tại.',
  uq_vaitro_ten: 'Tên vai trò này đã tồn tại.',
  uq_nguoidung_tendangnhap: 'Tên đăng nhập này đã được sử dụng.',
  uq_nguoidung_email: 'Email này đã được sử dụng.',
  uq_sinhvien_nguoidung: 'Người dùng này đã được gắn với một sinh viên khác.',
};

/** Lấy tên constraint từ câu thông báo gốc của MySQL */
function extractConstraint(sqlMessage: string, dictionary: Record<string, string>): string | null {
  for (const name of Object.keys(dictionary)) {
    if (sqlMessage.includes(name)) return dictionary[name];
  }
  return null;
}

@Catch()
export class MysqlExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(MysqlExceptionFilter.name);

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception?.sqlState) {
      const sqlMessage: string = exception.sqlMessage ?? '';

      // SIGNAL từ Stored Procedure và Trigger — message đã là tiếng Việt, giữ nguyên văn
      if (exception.sqlState === '45000') {
        return this.badRequest(response, sqlMessage);
      }

      if (exception.sqlState === '23000') {
        // Trùng khóa duy nhất: thêm bản ghi mà giá trị đã tồn tại
        if (exception.code === 'ER_DUP_ENTRY') {
          return this.badRequest(
            response,
            extractConstraint(sqlMessage, UNIQUE_KEY_MESSAGES) ??
              'Dữ liệu này đã tồn tại trong hệ thống.',
          );
        }

        // Xóa bản ghi cha khi vẫn còn bản ghi con tham chiếu tới
        if (exception.code === 'ER_ROW_IS_REFERENCED_2' || exception.code === 'ER_ROW_IS_REFERENCED') {
          return this.badRequest(
            response,
            extractConstraint(sqlMessage, FOREIGN_KEY_MESSAGES) ??
              'Không thể xóa vì dữ liệu này đang được sử dụng ở nơi khác.',
          );
        }

        // Thêm hoặc sửa bản ghi trỏ tới một bản ghi cha không tồn tại
        if (exception.code === 'ER_NO_REFERENCED_ROW_2' || exception.code === 'ER_NO_REFERENCED_ROW') {
          return this.badRequest(
            response,
            'Dữ liệu tham chiếu không tồn tại. Vui lòng kiểm tra lại các mục đã chọn.',
          );
        }

        return this.badRequest(response, 'Dữ liệu không hợp lệ hoặc đang được sử dụng ở nơi khác.');
      }

      this.logger.error(`Lỗi MySQL chưa xử lý [${exception.sqlState}] ${sqlMessage}`);
    }

    if (exception?.getStatus) {
      const status = exception.getStatus();
      return response.status(status).json(exception.getResponse());
    }

    this.logger.error('Unhandled exception', exception?.stack || exception);

    return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Máy chủ gặp sự cố, vui lòng thử lại sau.',
      error: 'Internal Server Error',
    });
  }

  private badRequest(response: Response, message: string) {
    return response.status(HttpStatus.BAD_REQUEST).json({
      statusCode: HttpStatus.BAD_REQUEST,
      message,
      error: 'Bad Request',
    });
  }
}
