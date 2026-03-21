import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Usuario } from '../entities';
import { LoginDto } from './login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto): Promise<{ token: string; perfil: string; nome: string }> {
    const usuario = await this.usuarioRepository.findOne({
      where: { email: dto.email },
    });

    const senhaValida =
      usuario != null && (await bcrypt.compare(dto.senha, usuario.senha_hash));

    if (!usuario || !senhaValida) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const payload = { sub: usuario.id, perfil: usuario.tipo };
    const token = await this.jwtService.signAsync(payload);

    return {
      token,
      perfil: usuario.tipo,
      nome: usuario.nome,
    };
  }
}
