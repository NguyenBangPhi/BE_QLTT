import { Controller, Get, Put, Param, Body, UseGuards } from '@nestjs/common';
import { StatsService } from './stats.service';
import { UpdateConfigDto } from './dto/update-config.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Thống kê & Cấu hình')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Roles('Admin', 'Thủ thư')
  @ApiOperation({ summary: 'Sách đang mượn' })
  @Get('stats/borrowing')
  getBorrowing() {
    return this.statsService.getBorrowing();
  }

  @Roles('Admin', 'Thủ thư')
  @ApiOperation({ summary: 'Sách quá hạn' })
  @Get('stats/overdue')
  getOverdue() {
    return this.statsService.getOverdue();
  }

  @Roles('Admin')
  @ApiOperation({ summary: 'Danh sách cấu hình' })
  @Get('configs')
  getConfigs() {
    return this.statsService.getConfigs();
  }

  @Roles('Admin')
  @ApiOperation({ summary: 'Cập nhật cấu hình' })
  @Put('configs/:key')
  updateConfig(@Param('key') key: string, @Body() dto: UpdateConfigDto) {
    return this.statsService.updateConfig(key, dto.value);
  }
}
