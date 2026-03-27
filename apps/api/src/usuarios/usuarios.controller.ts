import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UsuariosService } from './usuarios.service';
import { CriarUsuarioDto } from './criar-usuario.dto';
import { IsString, IsUUID, MinLength } from 'class-validator';

class AlterarSenhaDto {
  @IsString()
  @MinLength(8)
  nova_senha!: string;
}

class MigrarDto {
  @IsUUID()
  destino_id!: string;
}

@Controller('usuarios')
@UseGuards(JwtAuthGuard)
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Get('me')
  @HttpCode(HttpStatus.OK)
  me(@Request() req: any) {
    return this.usuariosService.buscarPorId(req.user.userId);
  }

  // ---- Endpoints para usuários admin (antes das rotas :id) ----

  @Post('admins')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.CREATED)
  criarAdmin(@Body() dto: CriarUsuarioDto, @Request() req: any) {
    return this.usuariosService.criarAdmin(dto, req.user.empresa_id);
  }

  @Get('admins')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  listarAdmins(@Request() req: any) {
    return this.usuariosService.listarAdmins(req.user.empresa_id);
  }

  @Delete('admins/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  inativarAdmin(@Param('id') id: string, @Request() req: any) {
    return this.usuariosService.inativarAdmin(id, req.user.empresa_id);
  }

  @Patch('admins/:id/reativar')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  reativarAdmin(@Param('id') id: string, @Request() req: any) {
    return this.usuariosService.reativarAdmin(id, req.user.empresa_id);
  }

  @Patch('admins/:id/senha')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  alterarSenhaAdmin(@Param('id') id: string, @Body() dto: AlterarSenhaDto, @Request() req: any) {
    return this.usuariosService.alterarSenhaAdmin(id, dto.nova_senha, req.user.empresa_id);
  }

  // ---- Endpoints para entregadores ----

  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.CREATED)
  criar(@Body() dto: CriarUsuarioDto, @Request() req: any) {
    return this.usuariosService.criar(dto, req.user.empresa_id);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  listar(@Request() req: any) {
    return this.usuariosService.listar(req.user.empresa_id);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  excluir(@Param('id') id: string, @Request() req: any) {
    return this.usuariosService.excluir(id, req.user.empresa_id);
  }

  @Delete(':id/permanente')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  excluirPermanente(@Param('id') id: string, @Request() req: any) {
    return this.usuariosService.excluirPermanente(id, req.user.empresa_id);
  }

  @Patch(':id/reativar')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  reativar(@Param('id') id: string, @Request() req: any) {
    return this.usuariosService.reativar(id, req.user.empresa_id);
  }

  @Patch(':id/senha')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  alterarSenha(@Param('id') id: string, @Body() dto: AlterarSenhaDto, @Request() req: any) {
    return this.usuariosService.alterarSenha(id, dto.nova_senha, req.user.empresa_id);
  }

  @Get(':id/pendencias')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  contarPendencias(@Param('id') id: string, @Request() req: any) {
    return this.usuariosService.contarPendencias(id, req.user.empresa_id);
  }

  @Post(':id/migrar')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  migrar(@Param('id') id: string, @Body() dto: MigrarDto, @Request() req: any) {
    return this.usuariosService.migrar(id, dto.destino_id, req.user.empresa_id);
  }
}
