import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CampoImagem } from '../entities/campo-imagem.entity';
import { CamposImagemService } from './campos-imagem.service';
import { CamposImagemController } from './campos-imagem.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CampoImagem])],
  controllers: [CamposImagemController],
  providers: [CamposImagemService],
  exports: [CamposImagemService],
})
export class CamposImagemModule {}
