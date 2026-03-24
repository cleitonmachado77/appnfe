import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Entrega } from './entrega.entity';

@Entity('dados_nfe')
export class DadosNfe {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', unique: true })
  entrega_id!: string;

  // Emitente
  @Column({ type: 'varchar', length: 255, nullable: true })
  emit_nome!: string | null;

  @Column({ type: 'varchar', length: 18, nullable: true })
  emit_cnpj!: string | null;

  @Column({ type: 'varchar', length: 2, nullable: true })
  emit_uf!: string | null;

  // Destinatário
  @Column({ type: 'varchar', length: 255, nullable: true })
  dest_nome!: string | null;

  @Column({ type: 'varchar', length: 18, nullable: true })
  dest_cnpj_cpf!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  dest_municipio!: string | null;

  @Column({ type: 'varchar', length: 2, nullable: true })
  dest_uf!: string | null;

  // Nota
  @Column({ type: 'varchar', length: 20, nullable: true })
  numero_nfe!: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  serie!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  data_emissao!: Date | null;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  valor_total!: number | null;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  valor_produtos!: number | null;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  valor_frete!: number | null;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  valor_desconto!: number | null;

  @Column({ type: 'int', nullable: true })
  quantidade_itens!: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  natureza_operacao!: string | null;

  // Transporte
  @Column({ type: 'varchar', length: 255, nullable: true })
  transportadora_nome!: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 3, nullable: true })
  peso_bruto!: number | null;

  @CreateDateColumn({ type: 'timestamptz' })
  criado_em!: Date;

  @OneToOne(() => Entrega)
  @JoinColumn({ name: 'entrega_id' })
  entrega!: Entrega;
}
