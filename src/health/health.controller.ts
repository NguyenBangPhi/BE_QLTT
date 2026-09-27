import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DatabaseService } from '../database/database.service';

@ApiTags('Hệ thống & Cronjob')
@Controller('api/health')
export class HealthController {
  constructor(private readonly db: DatabaseService) {}

  @ApiOperation({ summary: 'Kiểm tra API và kết nối MySQL' })
  @ApiResponse({ status: 200, description: 'API và DB đều hoạt động' })
  @ApiResponse({ status: 503, description: 'Không kết nối được MySQL' })
  @Get()
  async check() {
    try {
      await this.db.query('SELECT 1');
    } catch {
      throw new ServiceUnavailableException('Không kết nối được tới MySQL');
    }
    return { status: 'ok', database: 'up' };
  }
}
