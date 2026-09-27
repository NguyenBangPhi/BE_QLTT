import { Controller, Get, Post, Put, Body, Param, Query, ParseIntPipe, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { BorrowService } from './borrow.service';
import { BorrowBookDto } from './dto/borrow-book.dto';
import { ReturnBookDto } from './dto/return-book.dto';
import { UpdateFineDto } from './dto/update-fine.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

@ApiTags('Mượn / Trả')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api')
export class BorrowController {
  constructor(private readonly borrowService: BorrowService) {}

  @Roles('Admin', 'Thủ thư')
  @ApiOperation({ summary: 'Mượn sách' })
  @Post('borrow')
  borrowBook(@Body() dto: BorrowBookDto, @Request() req: any) {
    return this.borrowService.borrowBook(req.user.sub, dto);
  }

  @Roles('Admin', 'Thủ thư')
  @ApiOperation({ summary: 'Trả sách' })
  @Post('return')
  returnBook(@Body() dto: ReturnBookDto) {
    return this.borrowService.returnBook(dto);
  }

  @Roles('Admin', 'Thủ thư')
  @ApiOperation({
    summary: 'Danh sách chi tiết mượn/trả',
    description:
      'Trả về MaCTPM nên dùng được cho màn điều chỉnh tiền phạt của sách đã trả. ' +
      'Lọc trangThai=1 để xem đang mượn, trangThai=0 để xem đã trả.',
  })
  @ApiQuery({ name: 'maSV', required: false })
  @ApiQuery({ name: 'keyword', required: false, description: 'Tìm theo họ tên, mã SV, tên sách hoặc ISBN' })
  @ApiQuery({ name: 'trangThai', required: false, type: Number, description: '1: đang mượn, 0: đã trả' })
  @ApiQuery({ name: 'tuNgay', required: false, description: 'Lọc theo NgayMuon, dạng YYYY-MM-DD' })
  @ApiQuery({ name: 'denNgay', required: false, description: 'Lọc theo NgayMuon, dạng YYYY-MM-DD' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @Get('borrow')
  findAll(
    @Query('maSV') maSV?: string,
    @Query('keyword') keyword?: string,
    @Query('trangThai', new ParseIntPipe({ optional: true })) trangThai?: number,
    @Query('tuNgay') tuNgay?: string,
    @Query('denNgay') denNgay?: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.borrowService.findAll({
      maSV,
      keyword,
      trangThai,
      tuNgay,
      denNgay,
      page: page || 1,
      limit: limit || 50,
    });
  }

  @Roles('Admin', 'Thủ thư')
  @ApiOperation({ summary: 'Cập nhật tiền phạt và ghi chú' })
  @Put('borrow/fines/:id')
  updateFine(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateFineDto) {
    return this.borrowService.updateFine(id, dto);
  }

  @ApiOperation({ summary: 'Lịch sử mượn trả' })
  @ApiQuery({ name: 'maSV', required: false })
  @Get('borrow/history')
  getBorrowHistory(@Request() req: any, @Query('maSV') maSVQuery?: string) {
    const user = req.user;
    let targetMaSV = maSVQuery;

    if (user.role === 'Sinh viên') {
      if (maSVQuery && maSVQuery !== user.maSV) {
        throw new ForbiddenException('Bạn chỉ được xem lịch sử mượn của chính mình');
      }
      targetMaSV = user.maSV;
    } else {
      if (!targetMaSV) {
        throw new ForbiddenException('Admin/Thủ thư cần truyền maSV để tra cứu');
      }
    }

    return this.borrowService.getBorrowHistory(targetMaSV!);
  }
}
