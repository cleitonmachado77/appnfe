import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Entrega } from './entrega.entity';
import { Empresa } from './empresa.entity';

export enum PerfilUsuario {
  ENTREGADOR = 'ENTREGADOR',
  ADMIN = 'ADMIN',
  USUARIO = 'USUARIO',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

@Entity('usuarios')
export class Usuario {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  nome!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  @Column({ type: 'varchar', length: 255 })
  senha_hash!: string;

  @Column({ type: 'enum', enum: PerfilUsuario })
  tipo!: PerfilUsuario;

  @Column({ type: 'uuid', nullable: true })
  empresa_id!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  cargo!: string | null;

  @Column({ type: 'boolean', default: true })
  ativo!: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  inativado_em!: Date | null;

  @ManyToOne(() => Empresa, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'empresa_id' })
  empresa!: Empresa | null;

  @CreateDateColumn({ type: 'timestamptz' })
  criado_em!: Date;

  @OneToMany(() => Entrega, (entrega) => entrega.entregador)
  entregas!: Entrega[];
}
