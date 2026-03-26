import {
  Controller, Get, HttpCode, HttpStatus,
  Param, Patch, Request, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { NotificacoesService } from './notificacoes.service';

@Controller('notificacoes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ENTREGADOR')
export class NotificacoesController {
  constructor(private readonly service: NotificacoesService) {}

  @Get()
  async listar(@Request() req: any) {
    return this.service.listar(req.user.userId);
  }

  @Get('nao-lidas')
  async contarNaoLidas(@Request() req: any) {
    const count = await this.service.contarNaoLidas(req.user.userId);
    return { count };
  }

  @Patch(':id/lida')
  @HttpCode(HttpStatus.NO_CONTENT)
  async marcarLida(@Param('id') id: string, @Request() req: any) {
    return this.service.marcarLida(id, req.user.userId);
  }

  @Patch('todas/lidas')
  @HttpCode(HttpStatus.NO_CONTENT)
  async marcarTodasLidas(@Request() req: any) {
    return this.service.marcarTodasLidas(req.user.userId);
  }
}
