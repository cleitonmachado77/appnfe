import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus,
  Param, Patch, Post, Request, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CamposImagemService, CriarCampoDto, AtualizarCampoDto } from './campos-imagem.service';

@Controller('campos-imagem')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CamposImagemController {
  constructor(private readonly service: CamposImagemService) {}

  /** Entregador busca os campos ativos da sua empresa */
  @Get('meus')
  @Roles('ENTREGADOR', 'ADMIN')
  async meus(@Request() req: any) {
    return this.service.listarAtivos(req.user.empresa_id);
  }

  /** Admin lista todos os campos (incluindo inativos) */
  @Get()
  @Roles('ADMIN', 'USUARIO')
  async listar(@Request() req: any) {
    return this.service.listar(req.user.empresa_id);
  }

  @Post()
  @Roles('ADMIN', 'USUARIO')
  @HttpCode(HttpStatus.CREATED)
  async criar(@Body() dto: CriarCampoDto, @Request() req: any) {
    return this.service.criar(req.user.empresa_id, dto);
  }

  @Patch(':id')
  @Roles('ADMIN', 'USUARIO')
  async atualizar(@Param('id') id: string, @Body() dto: AtualizarCampoDto, @Request() req: any) {
    return this.service.atualizar(id, req.user.empresa_id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'USUARIO')
  @HttpCode(HttpStatus.NO_CONTENT)
  async excluir(@Param('id') id: string, @Request() req: any) {
    return this.service.excluir(id, req.user.empresa_id);
  }
}
