import {
  BadRequestException, ForbiddenException,
  Injectable, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransferenciaEntrega, StatusTransferencia } from '../entities/transferencia-entrega.entity';
import { Entrega, StatusEntrega } from '../entities/entrega.entity';
import { Usuario, PerfilUsuario } from '../entities/usuario.entity';

@Injectable()
export class TransferenciasService {
  constructor(
    @InjectRepository(TransferenciaEntrega)
    private readonly repo: Repository<TransferenciaEntrega>,
    @InjectRepository(Entrega)
    private readonly entregaRepo: Repository<Entrega>,
    @InjectRepository(Usuario)
    private readonly usuarioRepo: Repository<Usuario>,
  ) {}

  /** Lista entregadores ativos da mesma empresa, excluindo o próprio solicitante */
  async listarColegas(userId: string): Promise<Pick<Usuario, 'id' | 'nome'>[]> {
    const eu = await this.usuarioRepo.findOne({ where: { id: userId } });
    if (!eu?.empresa_id) return [];

    const colegas = await this.usuarioRepo.find({
      where: { empresa_id: eu.empresa_id, tipo: PerfilUsuario.ENTREGADOR, ativo: true },
      order: { nome: 'ASC' },
    });

    return colegas
      .filter((c) => c.id !== userId)
      .map(({ id, nome }) => ({ id, nome }));
  }

  /** Solicita transferência de uma entrega pendente */
  async solicitar(
    entregaId: string,
    remetenteId: string,
    destinatarioId: string,
    mensagem?: string,
  ): Promise<TransferenciaEntrega> {
    const entrega = await this.entregaRepo.findOne({ where: { id: entregaId } });
    if (!entrega) throw new NotFoundException('Entrega não encontrada');
    if (entrega.entregador_id !== remetenteId) throw new ForbiddenException('Acesso negado');
    if (entrega.status !== StatusEntrega.PENDENTE) {
      throw new BadRequestException('Só é possível transferir entregas com status PENDENTE');
    }

    // Verifica se já existe transferência pendente para esta entrega
    const jaExiste = await this.repo.findOne({
      where: { entrega_id: entregaId, status: StatusTransferencia.PENDENTE },
    });
    if (jaExiste) throw new BadRequestException('Esta entrega já possui uma transferência pendente');

    // Valida que destinatário é da mesma empresa
    const remetente = await this.usuarioRepo.findOne({ where: { id: remetenteId } });
    const destinatario = await this.usuarioRepo.findOne({ where: { id: destinatarioId } });
    if (!destinatario) throw new NotFoundException('Entregador destinatário não encontrado');
    if (destinatario.empresa_id !== remetente?.empresa_id) {
      throw new BadRequestException('O destinatário deve pertencer à mesma empresa');
    }

    const transferencia = this.repo.create({
      entrega_id: entregaId,
      remetente_id: remetenteId,
      destinatario_id: destinatarioId,
      mensagem: mensagem ?? null,
      status: StatusTransferencia.PENDENTE,
    });

    return this.repo.save(transferencia);
  }

  /** Lista transferências recebidas e pendentes de resposta */
  async listarRecebidas(destinatarioId: string): Promise<TransferenciaEntrega[]> {
    return this.repo.find({
      where: { destinatario_id: destinatarioId, status: StatusTransferencia.PENDENTE },
      relations: ['entrega', 'entrega.imagens', 'remetente'],
      order: { criado_em: 'DESC' },
    });
  }

  /** Lista transferências enviadas pelo entregador (para saber quais estão aguardando) */
  async listarEnviadas(remetenteId: string): Promise<TransferenciaEntrega[]> {
    return this.repo.find({
      where: { remetente_id: remetenteId, status: StatusTransferencia.PENDENTE },
      relations: ['entrega', 'destinatario'],
      order: { criado_em: 'DESC' },
    });
  }

  async aceitar(transferenciaId: string, destinatarioId: string): Promise<void> {
    const t = await this.repo.findOne({
      where: { id: transferenciaId },
      relations: ['entrega'],
    });
    if (!t) throw new NotFoundException('Transferência não encontrada');
    if (t.destinatario_id !== destinatarioId) throw new ForbiddenException('Acesso negado');
    if (t.status !== StatusTransferencia.PENDENTE) {
      throw new BadRequestException('Esta transferência já foi respondida');
    }

    // Reatribui a entrega ao destinatário
    await this.entregaRepo.update(t.entrega_id, { entregador_id: destinatarioId });
    await this.repo.update(transferenciaId, { status: StatusTransferencia.ACEITA });
  }

  async recusar(transferenciaId: string, destinatarioId: string): Promise<void> {
    const t = await this.repo.findOne({ where: { id: transferenciaId } });
    if (!t) throw new NotFoundException('Transferência não encontrada');
    if (t.destinatario_id !== destinatarioId) throw new ForbiddenException('Acesso negado');
    if (t.status !== StatusTransferencia.PENDENTE) {
      throw new BadRequestException('Esta transferência já foi respondida');
    }

    await this.repo.update(transferenciaId, { status: StatusTransferencia.RECUSADA });
  }

  /** Cancela uma transferência enviada (antes de ser respondida) */
  async cancelar(transferenciaId: string, remetenteId: string): Promise<void> {
    const t = await this.repo.findOne({ where: { id: transferenciaId } });
    if (!t) throw new NotFoundException('Transferência não encontrada');
    if (t.remetente_id !== remetenteId) throw new ForbiddenException('Acesso negado');
    if (t.status !== StatusTransferencia.PENDENTE) {
      throw new BadRequestException('Esta transferência já foi respondida');
    }
    await this.repo.update(transferenciaId, { status: StatusTransferencia.RECUSADA });
  }
}
