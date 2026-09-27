import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  ParseIntPipe,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UpdateCardStatusDto } from './dto/update-card-status.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

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
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserStatusDto,
    @Request() req: any,
  ) {
    // Chỉ Admin mới mở khóa được tài khoản. Nếu Admin tự khóa chính mình thì không còn
    // đường nào đăng nhập lại để mở, phải sửa tay trong database.
    if (dto.trangThai === 0 && id === req.user.sub) {
      throw new BadRequestException('Bạn không thể tự khóa tài khoản của chính mình.');
    }
    return this.usersService.updateUserStatus(id, dto.trangThai);
  }

  @Roles('Admin', 'Thủ thư')
  @ApiOperation({
    summary: 'Danh sách sinh viên (kèm số sách đang mượn)',
    description:
      'Phục vụ màn lập phiếu mượn và quản lý thẻ. Số sách đang mượn lấy từ fn_CountBorrowedBooks.',
  })
  @ApiQuery({ name: 'keyword', required: false, description: 'Tìm theo mã SV, họ tên hoặc lớp' })
  @ApiQuery({ name: 'trangThaiThe', required: false, type: Number, description: '1: ACTIVE, 0: LOCKED' })
  @Get('students')
  findAllStudents(
    @Query('keyword') keyword?: string,
    @Query('trangThaiThe', new ParseIntPipe({ optional: true })) trangThaiThe?: number,
  ) {
    return this.usersService.findAllStudents(keyword, trangThaiThe);
  }

  @ApiOperation({ summary: 'Chi tiết một sinh viên' })
  @Get('students/:maSV')
  findOneStudent(@Param('maSV') maSV: string, @Request() req: any) {
    if (req.user.role === 'Sinh viên' && req.user.maSV !== maSV) {
      throw new ForbiddenException('Bạn chỉ được xem thông tin của chính mình');
    }
    return this.usersService.findOneStudent(maSV);
  }

  @Roles('Admin')
  @ApiOperation({ summary: 'Cập nhật trạng thái thẻ sinh viên' })
  @Put('students/:id/card-status')
  updateCardStatus(@Param('id') id: string, @Body() dto: UpdateCardStatusDto) {
    return this.usersService.updateCardStatus(id, dto.trangThaiThe);
  }
}
