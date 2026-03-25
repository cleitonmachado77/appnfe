import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { SuperAdminService } from './super-admin.service';
import { CadastrarEmpresaDto } from './cadastrar-empresa.dto';
import { StatusEmpresa } from '../entities/empresa.entity';

@Controller('super-admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class SuperAdminController {
  constructor(private readonly service: SuperAdminService) {}

  @Post('empresas')
  @HttpCode(HttpStatus.CREATED)
  cadastrarEmpresa(@Body() dto: CadastrarEmpresaDto) {
    return this.service.cadastrarEmpresa(dto);
  }

  @Get('empresas')
  @HttpCode(HttpStatus.OK)
  listarEmpresas() {
    return this.service.listarEmpresas();
  }

  @Get('empresas/:id')
  @HttpCode(HttpStatus.OK)
  buscarEmpresa(@Param('id') id: string) {
    return this.service.buscarEmpresa(id);
  }

  @Patch('empresas/:id/status')
  @HttpCode(HttpStatus.OK)
  atualizarStatus(@Param('id') id: string, @Query('status') status: StatusEmpresa) {
    return this.service.atualizarStatus(id, status);
  }

  @Get('stats')
  @HttpCode(HttpStatus.OK)
  getStats() {
    return this.service.getStatsGlobais();
  }
}
