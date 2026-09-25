import { Controller, Get, Put, Post, Param, Query, ParseIntPipe, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { SystemService } from './system.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

@ApiTags('Hệ thống & Cronjob')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api')
export class SystemController {
  constructor(private readonly systemService: SystemService) {}

  @Roles('Admin')
  @ApiOperation({ summary: 'Xem log hệ thống' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @Get('logs')
  getLogs(@Query('page', new ParseIntPipe({ optional: true })) page?: number, 
          @Query('limit', new ParseIntPipe({ optional: true })) limit?: number) {
    return this.systemService.getLogs(page || 1, limit || 50);
  }

  @Roles('Sinh viên')
  @ApiOperation({ summary: 'Xem thông báo' })
  @Get('notifications')
  getNotifications(@Request() req: any) {
    if (req.user.role !== 'Sinh viên' || !req.user.maSV) {
      throw new ForbiddenException('Chỉ sinh viên mới có thông báo cá nhân');
    }
    return this.systemService.getNotifications(req.user.maSV);
  }

  @Roles('Sinh viên')
  @ApiOperation({ summary: 'Đánh dấu đọc thông báo' })
  @Put('notifications/:id/read')
  markNotificationRead(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.systemService.markNotificationRead(id, req.user.maSV);
  }

  @Roles('Admin')
  @ApiOperation({ summary: 'Chạy thủ công sp_LockOverdueAccounts' })
  @Post('system/lock-overdue')
  lockOverdueAccounts() {
    return this.systemService.lockOverdueAccounts();
  }

  @Roles('Admin')
  @ApiOperation({ summary: 'Chạy thủ công sp_SendReminder' })
  @Post('system/send-reminders')
  sendReminders() {
    return this.systemService.sendReminders();
  }
}
