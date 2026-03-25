import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Quem executou
  @Column({ type: 'uuid', nullable: true })
  usuario_id!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  usuario_nome!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  usuario_email!: string | null;

  @Column({ type: 'uuid', nullable: true })
  empresa_id!: string | null;

  // O que aconteceu
  @Column({ type: 'varchar', length: 100 })
  acao!: string; // ex: CRIAR_ENTREGA, EXCLUIR_ENTREGADOR, LOGIN

  @Column({ type: 'varchar', length: 100, nullable: true })
  recurso!: string | null; // ex: entrega, entregador, empresa

  @Column({ type: 'uuid', nullable: true })
  recurso_id!: string | null;

  @Column({ type: 'text', nullable: true })
  descricao!: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  metodo_http!: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  rota!: string | null;

  @Column({ type: 'int', nullable: true })
  status_http!: number | null;

  @CreateDateColumn({ type: 'timestamptz' })
  criado_em!: Date;
}
