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
  @ApiOperation({ summary: 'Cập nhật tiền phạt' })
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
