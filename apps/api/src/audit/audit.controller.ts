import { Controller, Get, HttpCode, HttpStatus, Query, Request, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuditService } from './audit.service';

@Controller('audit')
@UseGuards(JwtAuthGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  listar(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditService.listar(
      req.user.empresa_id,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
    );
  }

  @Get('exportar')
  async exportar(@Request() req: any, @Res() res: Response) {
    const logs = await this.auditService.exportar(req.user.empresa_id);

    const header = 'Data/Hora,Operador,E-mail,Ação,Recurso,ID Recurso,Rota,Status HTTP\n';
    const rows = logs.map((l) => [
      new Date(l.criado_em).toLocaleString('pt-BR'),
      l.usuario_nome ?? '',
      l.usuario_email ?? '',
      l.acao,
      l.recurso ?? '',
      l.recurso_id ?? '',
      l.rota ?? '',
      l.status_http ?? '',
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="audit-log-${Date.now()}.csv"`);
    res.send('\uFEFF' + header + rows); // BOM para Excel reconhecer UTF-8
  }
}
