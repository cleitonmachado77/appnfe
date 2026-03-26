import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { MulterModule } from '@nestjs/platform-express';
import { NfeEmitida } from '../entities/nfe-emitida.entity';
import { ControleNsu } from '../entities/controle-nsu.entity';
import { Empresa } from '../entities/empresa.entity';
import { NfeCapturaService } from './nfe-captura.service';
import { NfeCapturaController } from './nfe-captura.controller';
import { NfeCapturaScheduler } from './nfe-captura.scheduler';
import { SefazDfeService } from './sefaz-dfe.service';
import { MeuDanfeService } from '../entregas/meudanfe.service';
import { CertificadoService } from './certificado.service';
import { CertificadoController } from './certificado.controller';
import { CertCryptoService } from './cert-crypto.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([NfeEmitida, ControleNsu, Empresa]),
    HttpModule,
    MulterModule.register({ limits: { fileSize: 1024 * 1024 } }),
  ],
  controllers: [NfeCapturaController, CertificadoController],
  providers: [
    NfeCapturaService,
    NfeCapturaScheduler,
    SefazDfeService,
    MeuDanfeService,
    CertificadoService,
    CertCryptoService,
  ],
  exports: [NfeCapturaService, CertificadoService],
})
export class NfeCapturaModule {}
