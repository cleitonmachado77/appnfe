import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Usuario } from '../entities/usuario.entity';
import { Entrega } from '../entities/entrega.entity';
import { Imagem } from '../entities/imagem.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [Usuario, Entrega, Imagem],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
});
