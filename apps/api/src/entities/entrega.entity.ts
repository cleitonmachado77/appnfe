import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Usuario } from './usuario.entity';
import { Imagem } from './imagem.entity';
import { DadosNfe } from './dados-nfe.entity';

export enum StatusEntrega {
  ENVIADO = 'ENVIADO',
  PENDENTE = 'PENDENTE',
  ERRO = 'ERRO',
}

@Entity('entregas')
@Index('idx_entregas_entregador', ['entregador_id'])
@Index('idx_entregas_data_hora', ['data_hora'])
@Index('idx_entregas_chave_nfe', ['chave_nfe'])
export class Entrega {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'char', length: 44 })
  chave_nfe!: string;

  @Column({ type: 'uuid' })
  entregador_id!: string;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  data_hora!: Date;

  @Column({ type: 'decimal', precision: 10, scale: 6 })
  latitude!: number;

  @Column({ type: 'decimal', precision: 10, scale: 6 })
  longitude!: number;

  @Column({ type: 'enum', enum: StatusEntrega, default: StatusEntrega.ENVIADO })
  status!: StatusEntrega;

  @Column({ type: 'text', nullable: true })
  danfe_pdf_base64!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  criado_em!: Date;

  @ManyToOne(() => Usuario, (usuario) => usuario.entregas)
  @JoinColumn({ name: 'entregador_id' })
  entregador!: Usuario;

  @OneToMany(() => Imagem, (imagem) => imagem.entrega)
  imagens!: Imagem[];

  @OneToOne(() => DadosNfe, (d) => d.entrega)
  dadosNfe!: DadosNfe;
}
