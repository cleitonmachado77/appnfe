import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Empresa } from './empresa.entity';

@Entity('controle_nsu')
export class ControleNsu {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', unique: true })
  empresa_id!: string;

  /** Último NSU processado com sucesso */
  @Column({ type: 'varchar', length: 15, default: '000000000000000' })
  ult_nsu!: string;

  /** Maior NSU disponível na SEFAZ (max_nsu retornado) */
  @Column({ type: 'varchar', length: 15, nullable: true })
  max_nsu!: string | null;

  @UpdateDateColumn({ type: 'timestamptz' })
  atualizado_em!: Date;

  @OneToOne(() => Empresa, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'empresa_id' })
  empresa!: Empresa;
}
