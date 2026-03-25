import { Controller, Get, HttpCode, HttpStatus, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('clientes')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  async getClientes(@Request() req: any) {
    return this.dashboardService.getClientes(req.user.empresa_id);
  }

  @Get()
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  async getDashboard(
    @Request() req: any,
    @Query('data_inicio') dataInicio?: string,
    @Query('data_fim') dataFim?: string,
    @Query('cliente_cnpj') clienteCnpj?: string,
    @Query('entregador_id') entregadorId?: string,
  ) {
    return this.dashboardService.getDashboard({
      data_inicio: dataInicio,
      data_fim: dataFim,
      cliente_cnpj: clienteCnpj,
      entregador_id: entregadorId,
      empresa_id: req.user.empresa_id,
    });
  }
}
