import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { Entrega } from './entrega.entity';

export enum PerfilUsuario {
  ENTREGADOR = 'ENTREGADOR',
  ADMIN = 'ADMIN',
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

  @CreateDateColumn({ type: 'timestamptz' })
  criado_em!: Date;

  @OneToMany(() => Entrega, (entrega) => entrega.entregador)
  entregas!: Entrega[];
}
