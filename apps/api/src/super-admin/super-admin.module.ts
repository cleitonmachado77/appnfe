import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Empresa } from '../entities/empresa.entity';
import { Usuario } from '../entities/usuario.entity';
import { Entrega } from '../entities/entrega.entity';
import { DadosNfe } from '../entities/dados-nfe.entity';
import { SuperAdminService } from './super-admin.service';
import { SuperAdminController } from './super-admin.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Empresa, Usuario, Entrega, DadosNfe])],
  controllers: [SuperAdminController],
  providers: [SuperAdminService],
})
export class SuperAdminModule {}
