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

  async buscarPorId(id: string) {
    const u = await this.usuariosRepository.findOne({ where: { id }, relations: ['empresa'] });
    if (!u) throw new Error('Usuário não encontrado');
    const { senha_hash: _, ...resultado } = u;
    return resultado;
  }

  async criar(dto: CriarUsuarioDto, empresa_id?: string | null): Promise<Omit<Usuario, 'senha_hash'>> {
    const existente = await this.usuariosRepository.findOne({ where: { email: dto.email } });
    if (existente) throw new ConflictException('Email já está em uso');

    const senha_hash = await bcrypt.hash(dto.senha, 10);
    const usuario = this.usuariosRepository.create({
      nome: dto.nome,
      email: dto.email,
      senha_hash,
      tipo: PerfilUsuario.ENTREGADOR,
      empresa_id: empresa_id ?? null,
    });

    const salvo = await this.usuariosRepository.save(usuario);
    const { senha_hash: _, ...resultado } = salvo;
    return resultado;
  }

  async excluir(id: string, empresa_id?: string | null): Promise<void> {
    const where: any = { id };
    if (empresa_id) where.empresa_id = empresa_id;
    const usuario = await this.usuariosRepository.findOne({ where });
    if (!usuario) throw new Error('Entregador não encontrado');
    await this.usuariosRepository.delete(id);
  }
    const where: any = { tipo: PerfilUsuario.ENTREGADOR };
    if (empresa_id) where.empresa_id = empresa_id;

    const usuarios = await this.usuariosRepository.find({ where, order: { criado_em: 'DESC' } });
    return usuarios.map(({ senha_hash: _, ...u }) => u);
  }
}
