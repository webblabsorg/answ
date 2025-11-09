import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  Query,
  UseGuards 
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ExamsService } from './exams.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Exams')
@Controller('exams')
export class ExamsController {
  constructor(private readonly examsService: ExamsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new exam (Admin only)' })
  create(@Body() createExamDto: CreateExamDto) {
    return this.examsService.create(createExamDto);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all exams' })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'is_active', required: false, type: Boolean })
  findAll(
    @Query('category') category?: string,
    @Query('is_active') is_active?: string,
  ) {
    const filters: any = {};
    if (category) filters.category = category;
    if (is_active !== undefined) filters.is_active = is_active === 'true';
    
    return this.examsService.findAll(filters);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get exam by ID' })
  findOne(@Param('id') id: string) {
    return this.examsService.findOne(id);
  }

  @Get('code/:code')
  @Public()
  @ApiOperation({ summary: 'Get exam by code' })
  findByCode(@Param('code') code: string) {
    return this.examsService.findByCode(code);
  }

  @Get(':id/stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get exam statistics' })
  getStatistics(@Param('id') id: string) {
    return this.examsService.getStatistics(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update exam (Admin only)' })
  update(@Param('id') id: string, @Body() updateExamDto: UpdateExamDto) {
    return this.examsService.update(id, updateExamDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete exam (Admin only)' })
  remove(@Param('id') id: string) {
    return this.examsService.remove(id);
  }
}
