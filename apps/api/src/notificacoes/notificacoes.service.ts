import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notificacao, TipoNotificacao } from '../entities/notificacao.entity';

@Injectable()
export class NotificacoesService {
  constructor(
    @InjectRepository(Notificacao)
    private readonly repo: Repository<Notificacao>,
  ) {}

  async criar(
    usuario_id: string,
    tipo: TipoNotificacao,
    mensagem: string,
    entrega_id?: string | null,
  ): Promise<Notificacao> {
    return this.repo.save(this.repo.create({ usuario_id, tipo, mensagem, entrega_id: entrega_id ?? null }));
  }

  async listar(usuario_id: string): Promise<Notificacao[]> {
    return this.repo.find({
      where: { usuario_id },
      order: { criado_em: 'DESC' },
      take: 50,
    });
  }

  async contarNaoLidas(usuario_id: string): Promise<number> {
    return this.repo.count({ where: { usuario_id, lida: false } });
  }

  async marcarLida(id: string, usuario_id: string): Promise<void> {
    await this.repo.update({ id, usuario_id }, { lida: true });
  }

  async marcarTodasLidas(usuario_id: string): Promise<void> {
    await this.repo.update({ usuario_id, lida: false }, { lida: true });
  }
}
