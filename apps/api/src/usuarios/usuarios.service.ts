import { ConflictException, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Usuario, PerfilUsuario } from '../entities';
import { Entrega, StatusEntrega } from '../entities/entrega.entity';
import { TransferenciaEntrega, StatusTransferencia } from '../entities/transferencia-entrega.entity';
import { CriarUsuarioDto } from './criar-usuario.dto';

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
    @InjectRepository(Entrega)
    private readonly entregaRepository: Repository<Entrega>,
    @InjectRepository(TransferenciaEntrega)
    private readonly transferenciaRepository: Repository<TransferenciaEntrega>,
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

  async listar(empresa_id?: string | null): Promise<Omit<Usuario, 'senha_hash'>[]> {
    const where: any = { tipo: PerfilUsuario.ENTREGADOR };
    if (empresa_id) where.empresa_id = empresa_id;

    const usuarios = await this.usuariosRepository.find({ where, order: { ativo: 'DESC', criado_em: 'DESC' } });
    return usuarios.map(({ senha_hash: _, ...u }) => u);
  }

  // Soft delete: inativa o entregador preservando histórico de entregas
  async excluir(id: string, empresa_id?: string | null): Promise<void> {
    const where: any = { id, tipo: PerfilUsuario.ENTREGADOR };
    if (empresa_id) where.empresa_id = empresa_id;
    const usuario = await this.usuariosRepository.findOne({ where });
    if (!usuario) throw new NotFoundException('Entregador não encontrado');
    await this.usuariosRepository.update(id, { ativo: false, inativado_em: new Date() });
  }

  // Hard delete: exclui permanentemente (apenas se inativo há 7+ dias)
  async excluirPermanente(id: string, empresa_id?: string | null): Promise<void> {
    const where: any = { id, tipo: PerfilUsuario.ENTREGADOR, ativo: false };
    if (empresa_id) where.empresa_id = empresa_id;
    const usuario = await this.usuariosRepository.findOne({ where });
    if (!usuario) throw new NotFoundException('Entregador não encontrado');
    if (!usuario.inativado_em) throw new BadRequestException('Entregador precisa estar inativo para ser excluído');
    const dias = Math.floor((Date.now() - new Date(usuario.inativado_em).getTime()) / (1000 * 60 * 60 * 24));
    if (dias < 7) throw new BadRequestException('Entregador precisa estar inativo há pelo menos 7 dias para ser excluído');
    await this.usuariosRepository.delete(id);
  }

  async reativar(id: string, empresa_id?: string | null): Promise<void> {
    const where: any = { id, tipo: PerfilUsuario.ENTREGADOR };
    if (empresa_id) where.empresa_id = empresa_id;
    const usuario = await this.usuariosRepository.findOne({ where });
    if (!usuario) throw new NotFoundException('Entregador não encontrado');
    if (usuario.ativo) throw new BadRequestException('Entregador já está ativo');
    await this.usuariosRepository.update(id, { ativo: true, inativado_em: null });
  }

  async alterarSenha(id: string, novaSenha: string, empresa_id?: string | null): Promise<void> {
    const where: any = { id, tipo: PerfilUsuario.ENTREGADOR };
    if (empresa_id) where.empresa_id = empresa_id;
    const usuario = await this.usuariosRepository.findOne({ where });
    if (!usuario) throw new NotFoundException('Entregador não encontrado');
    const senha_hash = await bcrypt.hash(novaSenha, 10);
    await this.usuariosRepository.update(id, { senha_hash });
  }

  async contarPendencias(id: string, empresa_id?: string | null): Promise<{ entregas_pendentes: number; transferencias_pendentes: number }> {
    const where: any = { id, tipo: PerfilUsuario.ENTREGADOR };
    if (empresa_id) where.empresa_id = empresa_id;
    const usuario = await this.usuariosRepository.findOne({ where });
    if (!usuario) throw new NotFoundException('Entregador não encontrado');

    const [entregas_pendentes, transferencias_pendentes] = await Promise.all([
      this.entregaRepository.count({ where: { entregador_id: id, status: StatusEntrega.PENDENTE } }),
      this.transferenciaRepository.count({ where: { remetente_id: id, status: StatusTransferencia.PENDENTE } }),
    ]);

    return { entregas_pendentes, transferencias_pendentes };
  }

  // ---- Usuários do Painel (perfil USUARIO) ----

  async criarAdmin(dto: CriarUsuarioDto, empresa_id?: string | null): Promise<Omit<Usuario, 'senha_hash'>> {
    const existente = await this.usuariosRepository.findOne({ where: { email: dto.email } });
    if (existente) throw new ConflictException('Email já está em uso');

    const senha_hash = await bcrypt.hash(dto.senha, 10);
    const usuario = this.usuariosRepository.create({
      nome: dto.nome,
      email: dto.email,
      senha_hash,
      tipo: PerfilUsuario.USUARIO,
      cargo: dto.cargo ?? null,
      empresa_id: empresa_id ?? null,
    });

    const salvo = await this.usuariosRepository.save(usuario);
    const { senha_hash: _, ...resultado } = salvo;
    return resultado;
  }

  async listarAdmins(empresa_id?: string | null): Promise<Omit<Usuario, 'senha_hash'>[]> {
    const where: any = [
      { tipo: PerfilUsuario.USUARIO, ...(empresa_id ? { empresa_id } : {}) },
      { tipo: PerfilUsuario.ADMIN, ...(empresa_id ? { empresa_id } : {}) },
    ];

    const usuarios = await this.usuariosRepository.find({ where, order: { ativo: 'DESC', criado_em: 'DESC' } });
    return usuarios.map(({ senha_hash: _, ...u }) => u);
  }

  async inativarAdmin(id: string, empresa_id?: string | null): Promise<void> {
    const where: any = { id, tipo: PerfilUsuario.USUARIO };
    if (empresa_id) where.empresa_id = empresa_id;
    const usuario = await this.usuariosRepository.findOne({ where });
    if (!usuario) throw new NotFoundException('Usuário não encontrado');
    await this.usuariosRepository.update(id, { ativo: false, inativado_em: new Date() });
  }

  async reativarAdmin(id: string, empresa_id?: string | null): Promise<void> {
    const where: any = { id, tipo: PerfilUsuario.USUARIO };
    if (empresa_id) where.empresa_id = empresa_id;
    const usuario = await this.usuariosRepository.findOne({ where });
    if (!usuario) throw new NotFoundException('Usuário não encontrado');
    if (usuario.ativo) throw new BadRequestException('Usuário já está ativo');
    await this.usuariosRepository.update(id, { ativo: true, inativado_em: null });
  }

  async alterarSenhaAdmin(id: string, novaSenha: string, empresa_id?: string | null): Promise<void> {
    const where: any = { id, tipo: PerfilUsuario.USUARIO };
    if (empresa_id) where.empresa_id = empresa_id;
    const usuario = await this.usuariosRepository.findOne({ where });
    if (!usuario) throw new NotFoundException('Usuário não encontrado');
    const senha_hash = await bcrypt.hash(novaSenha, 10);
    await this.usuariosRepository.update(id, { senha_hash });
  }

  async migrar(origemId: string, destinoId: string, empresa_id?: string | null): Promise<{ entregas_migradas: number; transferencias_migradas: number }> {
    const whereOrigem: any = { id: origemId, tipo: PerfilUsuario.ENTREGADOR };
    if (empresa_id) whereOrigem.empresa_id = empresa_id;
    const origem = await this.usuariosRepository.findOne({ where: whereOrigem });
    if (!origem) throw new NotFoundException('Entregador de origem não encontrado');

    const whereDestino: any = { id: destinoId, tipo: PerfilUsuario.ENTREGADOR, ativo: true };
    if (empresa_id) whereDestino.empresa_id = empresa_id;
    const destino = await this.usuariosRepository.findOne({ where: whereDestino });
    if (!destino) throw new NotFoundException('Entregador de destino não encontrado');

    if (origemId === destinoId) throw new BadRequestException('Origem e destino não podem ser o mesmo entregador');

    // Migra entregas pendentes
    const resultEntregas = await this.entregaRepository.update(
      { entregador_id: origemId, status: StatusEntrega.PENDENTE },
      { entregador_id: destinoId },
    );

    // Migra transferências pendentes onde origem é remetente
    const resultTransf = await this.transferenciaRepository.update(
      { remetente_id: origemId, status: StatusTransferencia.PENDENTE },
      { remetente_id: destinoId },
    );

    // Cancela transferências pendentes onde origem é destinatário (não faz sentido manter)
    await this.transferenciaRepository.update(
      { destinatario_id: origemId, status: StatusTransferencia.PENDENTE },
      { status: StatusTransferencia.RECUSADA },
    );

    return {
      entregas_migradas: resultEntregas.affected ?? 0,
      transferencias_migradas: resultTransf.affected ?? 0,
    };
  }}
