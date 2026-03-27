import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus,
  Param, Patch, Post, Query, Request, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { EntregasService } from './entregas.service';
import { CriarEntregaDto, FinalizarEntregaDto } from './criar-entrega.dto';
import { FiltrosEntregaDto } from './filtros-entrega.dto';
import { IsOptional, IsString } from 'class-validator';

class ReativarEntregaDto {
  @IsOptional()
  @IsString()
  comentario?: string;
}

@Controller('entregas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EntregasController {
  constructor(private readonly entregasService: EntregasService) {}

  @Post()
  @Roles('ENTREGADOR')
  @HttpCode(HttpStatus.CREATED)
  async criar(@Body() dto: CriarEntregaDto, @Request() req: any) {
    return this.entregasService.criar(dto, req.user.userId);
  }

  /** Lista entregas pendentes do próprio entregador */
  @Get('minhas-pendentes')
  @Roles('ENTREGADOR')
  @HttpCode(HttpStatus.OK)
  async minhasPendentes(@Request() req: any) {
    return this.entregasService.listarPendentesEntregador(req.user.userId);
  }

  /** Finaliza uma entrega pendente */
  @Patch(':id/finalizar')
  @Roles('ENTREGADOR')
  @HttpCode(HttpStatus.OK)
  async finalizar(@Param('id') id: string, @Body() dto: FinalizarEntregaDto, @Request() req: any) {
    return this.entregasService.finalizar(id, dto, req.user.userId);
  }

  /** Exclui uma entrega pendente do próprio entregador */
  @Delete(':id/pendente')
  @Roles('ENTREGADOR')
  @HttpCode(HttpStatus.NO_CONTENT)
  async excluirPendente(@Param('id') id: string, @Request() req: any) {
    return this.entregasService.excluirPendente(id, req.user.userId);
  }

  @Get()
  @Roles('ADMIN', 'USUARIO')
  @HttpCode(HttpStatus.OK)
  async listar(@Query() filtros: FiltrosEntregaDto, @Request() req: any) {
    return this.entregasService.listar(filtros, req.user.empresa_id);
  }

  @Get(':id')
  @Roles('ADMIN', 'USUARIO')
  @HttpCode(HttpStatus.OK)
  async buscarPorId(@Param('id') id: string) {
    return this.entregasService.buscarPorId(id);
  }

  @Post(':id/danfe')
  @Roles('ADMIN', 'USUARIO')
  @HttpCode(HttpStatus.OK)
  async reprocessarDanfe(@Param('id') id: string) {
    return this.entregasService.reprocessarDanfe(id);
  }

  @Patch(':id/reativar')
  @Roles('ADMIN', 'USUARIO')
  @HttpCode(HttpStatus.NO_CONTENT)
  async reativar(@Param('id') id: string, @Body() dto: ReativarEntregaDto) {
    return this.entregasService.reativar(id, dto.comentario);
  }

  @Patch(':id/conferir')
  @Roles('ADMIN', 'USUARIO')
  @HttpCode(HttpStatus.NO_CONTENT)
  async conferir(@Param('id') id: string, @Body() dto: { conferida: boolean }) {
    return this.entregasService.conferir(id, dto.conferida);
  }

  @Delete('imagens/:imagemId')
  @Roles('ADMIN', 'USUARIO')
  @HttpCode(HttpStatus.NO_CONTENT)
  async excluirImagem(@Param('imagemId') imagemId: string, @Request() req: any) {
    return this.entregasService.excluirImagem(imagemId, req.user.empresa_id);
  }

  @Patch(':id/limpar-campos')
  @Roles('ADMIN', 'USUARIO')
  @HttpCode(HttpStatus.NO_CONTENT)
  async limparCampos(
    @Param('id') id: string,
    @Body() dto: { chave_nfe?: boolean; localizacao?: boolean },
  ) {
    return this.entregasService.limparCampos(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'USUARIO')
  @HttpCode(HttpStatus.NO_CONTENT)
  async excluir(@Param('id') id: string) {
    return this.entregasService.excluir(id);
  }
}
