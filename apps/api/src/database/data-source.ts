import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Usuario } from '../entities/usuario.entity';
import { Entrega } from '../entities/entrega.entity';
import { Imagem } from '../entities/imagem.entity';
import { DadosNfe } from '../entities/dados-nfe.entity';
import { Empresa } from '../entities/empresa.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [Usuario, Entrega, Imagem, DadosNfe, Empresa],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
});
