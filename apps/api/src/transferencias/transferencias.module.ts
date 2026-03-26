import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransferenciaEntrega } from '../entities/transferencia-entrega.entity';
import { Entrega } from '../entities/entrega.entity';
import { Usuario } from '../entities/usuario.entity';
import { TransferenciasService } from './transferencias.service';
import { TransferenciasController } from './transferencias.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TransferenciaEntrega, Entrega, Usuario])],
  controllers: [TransferenciasController],
  providers: [TransferenciasService],
})
export class TransferenciasModule {}
