import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Entrega } from './entrega.entity';

export enum TipoImagem {
  CANHOTO = 'CANHOTO',
  LOCAL = 'LOCAL',
}

@Entity('imagens')
export class Imagem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  entrega_id!: string;

  /** Mantido para retrocompatibilidade — novos registros usam campo_key */
  @Column({ type: 'enum', enum: TipoImagem, nullable: true })
  tipo!: TipoImagem | null;

  /** Chave do campo personalizado (ex: "CANHOTO", "RECEITUARIO") */
  @Column({ type: 'varchar', length: 50, nullable: true })
  campo_key!: string | null;

  @Column({ type: 'varchar', length: 1024 })
  url_arquivo!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  criado_em!: Date;

  @ManyToOne(() => Entrega, (entrega) => entrega.imagens, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'entrega_id' })
  entrega!: Entrega;
}
