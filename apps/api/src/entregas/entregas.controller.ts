import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { EntregasService } from './entregas.service';
import { CriarEntregaDto } from './criar-entrega.dto';
import { FiltrosEntregaDto } from './filtros-entrega.dto';

@Controller('entregas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EntregasController {
  constructor(private readonly entregasService: EntregasService) {}

  @Post()
  @Roles('ENTREGADOR')
  @HttpCode(HttpStatus.CREATED)
  async criar(@Body() dto: CriarEntregaDto, @Request() req: any) {
    const entregadorId: string = req.user.userId;
    return this.entregasService.criar(dto, entregadorId);
  }

  @Get()
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  async listar(@Query() filtros: FiltrosEntregaDto) {
    return this.entregasService.listar(filtros);
  }

  @Get(':id')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  async buscarPorId(@Param('id') id: string) {
    return this.entregasService.buscarPorId(id);
  }

  @Post(':id/danfe')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  async reprocessarDanfe(@Param('id') id: string) {
    return this.entregasService.reprocessarDanfe(id);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  async excluir(@Param('id') id: string) {
    return this.entregasService.excluir(id);
  }
}
