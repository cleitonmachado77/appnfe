import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { Entrega, Imagem, Usuario, DadosNfe } from '../entities';
import { EntregasService } from './entregas.service';
import { EntregasController } from './entregas.controller';
import { MeuDanfeService } from './meudanfe.service';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Entrega, Imagem, Usuario, DadosNfe]),
    HttpModule,
  ],
  controllers: [EntregasController, DashboardController],
  providers: [EntregasService, MeuDanfeService, DashboardService],
  exports: [EntregasService],
})
export class EntregasModule {}
