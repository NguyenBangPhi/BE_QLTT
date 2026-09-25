import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { GenresService } from './genres.service';
import { CreateGenreDto } from './dto/create-genre.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Danh mục & Sách')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/genres')
export class GenresController {
  constructor(private readonly genresService: GenresService) {}

  @ApiOperation({ summary: 'Danh sách thể loại' })
  @Get()
  findAll() {
    return this.genresService.findAll();
  }

  @ApiOperation({ summary: 'Chi tiết thể loại' })
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.genresService.findOne(id);
  }

  @Roles('Admin', 'Thủ thư')
  @ApiOperation({ summary: 'Thêm thể loại' })
  @Post()
  create(@Body() dto: CreateGenreDto) {
    return this.genresService.create(dto);
  }

  @Roles('Admin', 'Thủ thư')
  @ApiOperation({ summary: 'Sửa thể loại' })
  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateGenreDto) {
    return this.genresService.update(id, dto);
  }

  @Roles('Admin', 'Thủ thư')
  @ApiOperation({ summary: 'Xóa thể loại' })
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.genresService.remove(id);
  }
}
