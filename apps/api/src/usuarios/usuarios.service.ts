import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Usuario, PerfilUsuario } from '../entities';
import { CriarUsuarioDto } from './criar-usuario.dto';

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
  ) {}

  async criar(dto: CriarUsuarioDto): Promise<Omit<Usuario, 'senha_hash'>> {
    const existente = await this.usuariosRepository.findOne({
      where: { email: dto.email },
    });

    if (existente) {
      throw new ConflictException('Email já está em uso');
    }

    const senha_hash = await bcrypt.hash(dto.senha, 10);

    const usuario = this.usuariosRepository.create({
      nome: dto.nome,
      email: dto.email,
      senha_hash,
      tipo: PerfilUsuario.ENTREGADOR,
    });

    const salvo = await this.usuariosRepository.save(usuario);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { senha_hash: _, ...resultado } = salvo;
    return resultado;
  }

  async listar(): Promise<Omit<Usuario, 'senha_hash'>[]> {
    const usuarios = await this.usuariosRepository.find({
      where: { tipo: PerfilUsuario.ENTREGADOR },
      order: { criado_em: 'DESC' },
    });

    return usuarios.map(({ senha_hash: _, ...u }) => u);
  }
}
