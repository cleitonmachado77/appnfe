import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { NfeCapturaService } from './nfe-captura.service';
import { StatusNfeEmitida } from '../entities/nfe-emitida.entity';

@Controller('nfe-emitidas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NfeCapturaController {
  constructor(private readonly nfeCapturaService: NfeCapturaService) {}

  @Get()
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  async listar(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: StatusNfeEmitida,
    @Query('data_inicio') data_inicio?: string,
    @Query('data_fim') data_fim?: string,
    @Query('dest_cnpj') dest_cnpj?: string,
    @Query('chave_nfe') chave_nfe?: string,
  ) {
    return this.nfeCapturaService.listarNfeEmitidas(req.user.empresa_id, {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      status,
      data_inicio,
      data_fim,
      dest_cnpj,
      chave_nfe,
    });
  }

  @Get('cruzamento')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  async cruzamento(@Request() req: any) {
    return this.nfeCapturaService.cruzarComEntregas(req.user.empresa_id);
  }

  @Get('controle-nsu')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  async controleNsu(@Request() req: any) {
    return this.nfeCapturaService.obterControleNsu(req.user.empresa_id);
  }

  @Get(':chave')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  async buscarPorChave(@Param('chave') chave: string, @Request() req: any) {
    return this.nfeCapturaService.buscarPorChave(chave, req.user.empresa_id);
  }

  /** Dispara captura manual para a empresa do admin logado */
  @Post('capturar')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.ACCEPTED)
  async capturarManual(@Request() req: any) {
    // Executa de forma assíncrona para não bloquear a resposta
    this.nfeCapturaService.capturarTodasEmpresas().catch(() => {});
    return { message: 'Captura iniciada em background' };
  }
}
