import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { AuthorsService } from './authors.service';
import { CreateAuthorDto } from './dto/create-author.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Danh mục & Sách')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/authors')
export class AuthorsController {
  constructor(private readonly authorsService: AuthorsService) {}

  @ApiOperation({ summary: 'Danh sách tác giả' })
  @Get()
  findAll() {
    return this.authorsService.findAll();
  }

  @ApiOperation({ summary: 'Chi tiết tác giả' })
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.authorsService.findOne(id);
  }

  @Roles('Admin', 'Thủ thư')
  @ApiOperation({ summary: 'Thêm tác giả' })
  @Post()
  create(@Body() dto: CreateAuthorDto) {
    return this.authorsService.create(dto);
  }

  @Roles('Admin', 'Thủ thư')
  @ApiOperation({ summary: 'Sửa tác giả' })
  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateAuthorDto) {
    return this.authorsService.update(id, dto);
  }

  @Roles('Admin', 'Thủ thư')
  @ApiOperation({ summary: 'Xóa tác giả' })
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.authorsService.remove(id);
  }
}
