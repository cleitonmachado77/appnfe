import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { Usuario, Entrega, Imagem, DadosNfe, Empresa, AuditLog, NfeEmitida, ControleNsu, CampoImagem, TransferenciaEntrega, Notificacao } from './entities';
import { AuthModule } from './auth/auth.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { UploadModule } from './upload/upload.module';
import { EntregasModule } from './entregas/entregas.module';
import { SuperAdminModule } from './super-admin/super-admin.module';
import { AuditModule } from './audit/audit.module';
import { AuditInterceptor } from './audit/audit.interceptor';
import { NfeCapturaModule } from './nfe-captura/nfe-captura.module';
import { CamposImagemModule } from './campos-imagem/campos-imagem.module';
import { TransferenciasModule } from './transferencias/transferencias.module';
import { NotificacoesModule } from './notificacoes/notificacoes.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../../.env'] }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('DATABASE_URL'),
        entities: [Usuario, Entrega, Imagem, DadosNfe, Empresa, AuditLog, NfeEmitida, ControleNsu, CampoImagem, TransferenciaEntrega, Notificacao],
        synchronize: false,
      }),
    }),
    AuthModule,
    UsuariosModule,
    UploadModule,
    EntregasModule,
    SuperAdminModule,
    AuditModule,
    NfeCapturaModule,
    CamposImagemModule,
    TransferenciasModule,
    NotificacoesModule,
  ],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}
