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

  @Column({ type: 'enum', enum: TipoImagem })
  tipo!: TipoImagem;

  @Column({ type: 'varchar', length: 1024 })
  url_arquivo!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  criado_em!: Date;

  @ManyToOne(() => Entrega, (entrega) => entrega.imagens, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'entrega_id' })
  entrega!: Entrega;
}
