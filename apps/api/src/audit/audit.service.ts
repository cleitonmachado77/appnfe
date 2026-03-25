import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../entities/audit-log.entity';

export interface LogEntry {
  usuario_id?: string | null;
  usuario_nome?: string | null;
  usuario_email?: string | null;
  empresa_id?: string | null;
  acao: string;
  recurso?: string | null;
  recurso_id?: string | null;
  descricao?: string | null;
  metodo_http?: string | null;
  rota?: string | null;
  status_http?: number | null;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly repo: Repository<AuditLog>,
  ) {}

  async registrar(entry: LogEntry): Promise<void> {
    try {
      await this.repo.save(this.repo.create(entry));
    } catch {
      // Nunca deixar falha de log quebrar a operação principal
    }
  }

  async listar(empresa_id?: string | null, page = 1, limit = 50) {
    const qb = this.repo.createQueryBuilder('l').orderBy('l.criado_em', 'DESC');
    if (empresa_id) qb.where('l.empresa_id = :empresa_id', { empresa_id });
    const [data, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
    return { data, total, page, limit };
  }

  async exportar(empresa_id?: string | null): Promise<AuditLog[]> {
    const qb = this.repo.createQueryBuilder('l').orderBy('l.criado_em', 'DESC');
    if (empresa_id) qb.where('l.empresa_id = :empresa_id', { empresa_id });
    return qb.getMany();
  }
}
