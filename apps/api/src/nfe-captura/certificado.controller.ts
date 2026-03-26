import {
  Controller, Post, Get, Delete, UseGuards, UseInterceptors,
  UploadedFile, Body, Request, HttpCode, HttpStatus, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CertificadoService } from './certificado.service';

@Controller('certificado')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class CertificadoController {
  constructor(private readonly certificadoService: CertificadoService) {}

  /**
   * Upload do certificado A1 (.pfx/.p12) da empresa.
   * Multipart: campo "certificado" (arquivo) + campo "senha" (texto).
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('certificado', { limits: { fileSize: 1024 * 1024 } }))
  async uploadCertificado(
    @UploadedFile() file: Express.Multer.File,
    @Body('senha') senha: string,
    @Request() req: any,
  ) {
    if (!file) throw new BadRequestException('Arquivo do certificado é obrigatório');
    if (!senha) throw new BadRequestException('Senha do certificado é obrigatória');

    return this.certificadoService.salvarCertificado(req.user.empresa_id, file.buffer, senha);
  }

  /** Retorna informações do certificado (sem expor o PFX ou senha) */
  @Get()
  @HttpCode(HttpStatus.OK)
  async infoCertificado(@Request() req: any) {
    return this.certificadoService.infoCertificado(req.user.empresa_id);
  }

  /** Remove o certificado da empresa */
  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async removerCertificado(@Request() req: any) {
    return this.certificadoService.removerCertificado(req.user.empresa_id);
  }
}
