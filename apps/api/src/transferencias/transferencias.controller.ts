import {
  Body, Controller, Get, HttpCode, HttpStatus,
  Param, Patch, Post, Request, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { TransferenciasService } from './transferencias.service';
import { IsOptional, IsString, IsUUID } from 'class-validator';

class SolicitarTransferenciaDto {
  @IsUUID()
  destinatario_id!: string;

  @IsOptional()
  @IsString()
  mensagem?: string;
}

@Controller('transferencias')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ENTREGADOR')
export class TransferenciasController {
  constructor(private readonly service: TransferenciasService) {}

  @Get('colegas')
  async colegas(@Request() req: any) {
    return this.service.listarColegas(req.user.userId);
  }

  @Get('recebidas')
  async recebidas(@Request() req: any) {
    return this.service.listarRecebidas(req.user.userId);
  }

  @Get('enviadas')
  async enviadas(@Request() req: any) {
    return this.service.listarEnviadas(req.user.userId);
  }

  @Post(':entregaId')
  @HttpCode(HttpStatus.CREATED)
  async solicitar(
    @Param('entregaId') entregaId: string,
    @Body() dto: SolicitarTransferenciaDto,
    @Request() req: any,
  ) {
    return this.service.solicitar(entregaId, req.user.userId, dto.destinatario_id, dto.mensagem);
  }

  @Patch(':id/aceitar')
  @HttpCode(HttpStatus.NO_CONTENT)
  async aceitar(@Param('id') id: string, @Request() req: any) {
    return this.service.aceitar(id, req.user.userId);
  }

  @Patch(':id/recusar')
  @HttpCode(HttpStatus.NO_CONTENT)
  async recusar(@Param('id') id: string, @Request() req: any) {
    return this.service.recusar(id, req.user.userId);
  }

  @Patch(':id/cancelar')
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancelar(@Param('id') id: string, @Request() req: any) {
    return this.service.cancelar(id, req.user.userId);
  }
}
