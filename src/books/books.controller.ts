import { Controller, Get, Post, Put, Delete, Body, Param, Query, ParseIntPipe, UseGuards, Request } from '@nestjs/common';
import { BooksService } from './books.service';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

@ApiTags('Danh mục & Sách')
@Controller('api/books')
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  @ApiOperation({ summary: 'Tìm kiếm sách' })
  @ApiQuery({ name: 'keyword', required: false })
  @ApiQuery({ name: 'maTacGia', required: false, type: Number })
  @ApiQuery({ name: 'maTheLoai', required: false, type: Number })
  @Get()
  search(
    @Query('keyword') keyword?: string,
    @Query('maTacGia', new ParseIntPipe({ optional: true })) maTacGia?: number,
    @Query('maTheLoai', new ParseIntPipe({ optional: true })) maTheLoai?: number,
  ) {
    return this.booksService.search(keyword, maTacGia, maTheLoai);
  }

  @ApiOperation({ summary: 'Chi tiết sách' })
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.booksService.findOne(id);
  }

  @ApiBearerAuth()
  @Roles('Admin', 'Thủ thư')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Thêm sách' })
  @Post()
  create(@Body() dto: CreateBookDto) {
    return this.booksService.create(dto);
  }

  @ApiBearerAuth()
  @Roles('Admin', 'Thủ thư')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Sửa sách' })
  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateBookDto, @Request() req: any) {
    return this.booksService.update(id, dto, req.user.username);
  }

  @ApiBearerAuth()
  @Roles('Admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Xóa sách' })
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.booksService.remove(id, req.user.username);
  }
}
