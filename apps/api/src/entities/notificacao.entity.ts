import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Usuario } from './usuario.entity';

export enum TipoNotificacao {
  REATIVACAO     = 'REATIVACAO',
  TRANSFERENCIA  = 'TRANSFERENCIA',
  MIGRACAO       = 'MIGRACAO',
}

@Entity('notificacoes')
export class Notificacao {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  usuario_id!: string;

  @Column({ type: 'enum', enum: TipoNotificacao })
  tipo!: TipoNotificacao;

  @Column({ type: 'text' })
  mensagem!: string;

  @Column({ type: 'uuid', nullable: true })
  entrega_id!: string | null;

  @Column({ type: 'boolean', default: false })
  lida!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  criado_em!: Date;

  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuario_id' })
  usuario!: Usuario;
}
