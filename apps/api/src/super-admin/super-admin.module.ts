import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Empresa } from '../entities/empresa.entity';
import { Usuario } from '../entities/usuario.entity';
import { Entrega } from '../entities/entrega.entity';
import { DadosNfe } from '../entities/dados-nfe.entity';
import { CampoImagem } from '../entities/campo-imagem.entity';
import { SuperAdminService } from './super-admin.service';
import { SuperAdminController } from './super-admin.controller';
import { CamposImagemService } from '../campos-imagem/campos-imagem.service';

@Module({
  imports: [TypeOrmModule.forFeature([Empresa, Usuario, Entrega, DadosNfe, CampoImagem])],
  controllers: [SuperAdminController],
  providers: [SuperAdminService, CamposImagemService],
})
export class SuperAdminModule {}
