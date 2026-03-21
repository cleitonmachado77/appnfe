import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Entrega, Imagem, Usuario } from '../entities';
import { EntregasService } from './entregas.service';
import { EntregasController } from './entregas.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Entrega, Imagem, Usuario])],
  controllers: [EntregasController],
  providers: [EntregasService],
  exports: [EntregasService],
})
export class EntregasModule {}
