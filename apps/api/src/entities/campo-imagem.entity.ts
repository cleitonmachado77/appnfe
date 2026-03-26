import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Empresa } from './empresa.entity';

@Entity('campos_imagem')
export class CampoImagem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  empresa_id!: string;

  /** Chave interna usada em imagens.campo_key (ex: "CANHOTO", "RECEITUARIO") */
  @Column({ type: 'varchar', length: 50 })
  key!: string;

  /** Label exibido ao entregador (ex: "Foto do Canhoto") */
  @Column({ type: 'varchar', length: 100 })
  label!: string;

  @Column({ type: 'boolean', default: true })
  obrigatorio!: boolean;

  @Column({ type: 'int', default: 0 })
  ordem!: number;

  @Column({ type: 'boolean', default: true })
  ativo!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  criado_em!: Date;

  @ManyToOne(() => Empresa, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'empresa_id' })
  empresa!: Empresa;
}
