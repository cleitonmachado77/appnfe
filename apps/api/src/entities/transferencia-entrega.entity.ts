import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Entrega } from './entrega.entity';
import { Usuario } from './usuario.entity';

export enum StatusTransferencia {
  PENDENTE  = 'PENDENTE',
  ACEITA    = 'ACEITA',
  RECUSADA  = 'RECUSADA',
}

@Entity('transferencias_entrega')
export class TransferenciaEntrega {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  entrega_id!: string;

  @Column({ type: 'uuid' })
  remetente_id!: string;

  @Column({ type: 'uuid' })
  destinatario_id!: string;

  @Column({ type: 'enum', enum: StatusTransferencia, default: StatusTransferencia.PENDENTE })
  status!: StatusTransferencia;

  @Column({ type: 'text', nullable: true })
  mensagem!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  criado_em!: Date;

  @ManyToOne(() => Entrega, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'entrega_id' })
  entrega!: Entrega;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'remetente_id' })
  remetente!: Usuario;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'destinatario_id' })
  destinatario!: Usuario;
}
