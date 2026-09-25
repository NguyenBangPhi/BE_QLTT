import { Controller, Get, Put, Body, Param, UseGuards, ParseIntPipe } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UpdateCardStatusDto } from './dto/update-card-status.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Auth & Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Roles('Admin')
  @ApiOperation({ summary: 'Lấy danh sách người dùng' })
  @Get('users')
  findAll() {
    return this.usersService.findAll();
  }

  @Roles('Admin')
  @ApiOperation({ summary: 'Cập nhật trạng thái người dùng (Khóa/Mở)' })
  @Put('users/:id/status')
  updateStatus(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserStatusDto) {
    return this.usersService.updateUserStatus(id, dto.trangThai);
  }

  @Roles('Admin')
  @ApiOperation({ summary: 'Cập nhật trạng thái thẻ sinh viên' })
  @Put('students/:id/card-status')
  updateCardStatus(@Param('id') id: string, @Body() dto: UpdateCardStatusDto) {
    return this.usersService.updateCardStatus(id, dto.trangThaiThe);
  }
}
