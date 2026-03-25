import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Usuario } from './usuario.entity';

export enum StatusEmpresa {
  ATIVA = 'ATIVA',
  INATIVA = 'INATIVA',
  SUSPENSA = 'SUSPENSA',
}

@Entity('empresas')
export class Empresa {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Dados da empresa
  @Column({ type: 'varchar', length: 255 })
  razao_social!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  nome_fantasia!: string | null;

  @Column({ type: 'varchar', length: 18, unique: true })
  cnpj!: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  inscricao_estadual!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  segmento!: string | null;

  // Contato
  @Column({ type: 'varchar', length: 255 })
  email_contato!: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  telefone!: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  celular!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  site!: string | null;

  // Endereço
  @Column({ type: 'varchar', length: 9, nullable: true })
  cep!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  logradouro!: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  numero!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  complemento!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  bairro!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  cidade!: string | null;

  @Column({ type: 'varchar', length: 2, nullable: true })
  uf!: string | null;

  // Responsável
  @Column({ type: 'varchar', length: 255 })
  responsavel_nome!: string;

  @Column({ type: 'varchar', length: 255 })
  responsavel_email!: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  responsavel_telefone!: string | null;

  @Column({ type: 'varchar', length: 14, nullable: true })
  responsavel_cpf!: string | null;

  // Plano / status
  @Column({ type: 'varchar', length: 50, nullable: true })
  plano!: string | null;

  @Column({ type: 'enum', enum: StatusEmpresa, default: StatusEmpresa.ATIVA })
  status!: StatusEmpresa;

  @Column({ type: 'text', nullable: true })
  observacoes!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  criado_em!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  atualizado_em!: Date;

  @OneToMany(() => Usuario, (u) => u.empresa)
  usuarios!: Usuario[];
}
