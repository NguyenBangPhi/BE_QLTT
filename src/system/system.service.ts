import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class SystemService {
  private readonly logger = new Logger(SystemService.name);

  constructor(private readonly db: DatabaseService) {}

  async getLogs(page = 1, limit = 50) {
    const offset = (page - 1) * limit;
    return this.db.query(
      'SELECT * FROM Log_HeThong ORDER BY ThoiGian DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );
  }

  async getNotifications(maSV: string) {
    return this.db.query(
      'SELECT * FROM ThongBao WHERE MaSV = ? ORDER BY NgayTao DESC',
      [maSV]
    );
  }

  async markNotificationRead(id: number, maSV: string) {
    await this.db.query(
      'UPDATE ThongBao SET DaDoc = 1 WHERE MaThongBao = ? AND MaSV = ?',
      [id, maSV]
    );
    return { message: 'Đã đánh dấu đọc thông báo' };
  }

  async lockOverdueAccounts() {
    await this.db.callProcedure('sp_LockOverdueAccounts');
    this.logger.log('Executed sp_LockOverdueAccounts');
    return { message: 'Đã khóa tài khoản quá hạn thành công' };
  }

  async sendReminders() {
    await this.db.callProcedure('sp_SendReminder');
    this.logger.log('Executed sp_SendReminder');
    return { message: 'Đã gửi thông báo nhắc nhở thành công' };
  }

  @Cron(process.env.LOCK_OVERDUE_CRON || CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleCronLockOverdue() {
    this.logger.log('Cronjob: Running lock overdue accounts...');
    try {
      await this.lockOverdueAccounts();
    } catch (err) {
      this.logger.error('Error in lock overdue cronjob', err);
    }
  }

  @Cron(process.env.SEND_REMINDER_CRON || '0 30 7 * * *') // Default 07:30 AM
  async handleCronSendReminders() {
    this.logger.log('Cronjob: Running send reminders...');
    try {
      await this.sendReminders();
    } catch (err) {
      this.logger.error('Error in send reminders cronjob', err);
    }
  }
}
