import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { DataSource } from 'typeorm';

// Carrega .env da raiz do monorepo
dotenv.config({ path: resolve(__dirname, '../../../../.env') });
dotenv.config({ path: resolve(__dirname, '../../.env') });
import { Usuario } from '../entities/usuario.entity';
import { Entrega } from '../entities/entrega.entity';
import { Imagem } from '../entities/imagem.entity';
import { DadosNfe } from '../entities/dados-nfe.entity';
import { Empresa } from '../entities/empresa.entity';
import { AuditLog } from '../entities/audit-log.entity';
import { NfeEmitida } from '../entities/nfe-emitida.entity';
import { ControleNsu } from '../entities/controle-nsu.entity';
import { CampoImagem } from '../entities/campo-imagem.entity';
import { TransferenciaEntrega } from '../entities/transferencia-entrega.entity';
import { Notificacao } from '../entities/notificacao.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [Usuario, Entrega, Imagem, DadosNfe, Empresa, AuditLog, NfeEmitida, ControleNsu, CampoImagem, TransferenciaEntrega, Notificacao],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
});
