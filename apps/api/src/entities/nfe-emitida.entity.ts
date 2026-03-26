import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Empresa } from './empresa.entity';

export enum StatusNfeEmitida {
  PENDENTE = 'PENDENTE',       // Apenas resumo recebido (resNFe)
  COMPLETA = 'COMPLETA',       // XML completo armazenado (procNFe)
  CANCELADA = 'CANCELADA',
  ERRO = 'ERRO',
}

@Entity('nfe_emitidas')
@Index('idx_nfe_emitidas_empresa', ['empresa_id'])
@Index('idx_nfe_emitidas_chave', ['chave_nfe'])
@Index('idx_nfe_emitidas_data_emissao', ['data_emissao'])
@Index('idx_nfe_emitidas_nsu', ['nsu'])
export class NfeEmitida {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  empresa_id!: string;

  @Column({ type: 'char', length: 44, unique: true })
  chave_nfe!: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  numero_nfe!: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  serie!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  dest_nome!: string | null;

  @Column({ type: 'varchar', length: 18, nullable: true })
  dest_cnpj_cpf!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  dest_municipio!: string | null;

  @Column({ type: 'varchar', length: 2, nullable: true })
  dest_uf!: string | null;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  valor_total!: number | null;

  @Column({ type: 'timestamptz', nullable: true })
  data_emissao!: Date | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  natureza_operacao!: string | null;

  @Column({ type: 'enum', enum: StatusNfeEmitida, default: StatusNfeEmitida.PENDENTE })
  status!: StatusNfeEmitida;

  /** NSU do documento na SEFAZ */
  @Column({ type: 'varchar', length: 15, nullable: true })
  nsu!: string | null;

  /** XML completo (procNFe) */
  @Column({ type: 'text', nullable: true })
  xml_completo!: string | null;

  /** DANFE em base64 */
  @Column({ type: 'text', nullable: true })
  danfe_pdf_base64!: string | null;

  /** Chave da entrega correspondente (cruzamento) */
  @Column({ type: 'char', length: 44, nullable: true })
  entrega_chave_nfe!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  criado_em!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  atualizado_em!: Date;

  @ManyToOne(() => Empresa, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'empresa_id' })
  empresa!: Empresa;
}
