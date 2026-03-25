import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UsuariosService } from './usuarios.service';
import { CriarUsuarioDto } from './criar-usuario.dto';

@Controller('usuarios')
@UseGuards(JwtAuthGuard)
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Get('me')
  @HttpCode(HttpStatus.OK)
  me(@Request() req: any) {
    return this.usuariosService.buscarPorId(req.user.userId);
  }

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
}
