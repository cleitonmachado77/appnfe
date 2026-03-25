import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Usuario, Entrega, Imagem, DadosNfe, Empresa } from './entities';
import { AuthModule } from './auth/auth.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { UploadModule } from './upload/upload.module';
import { EntregasModule } from './entregas/entregas.module';

import { SuperAdminModule } from './super-admin/super-admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('DATABASE_URL'),
        entities: [Usuario, Entrega, Imagem, DadosNfe, Empresa],
        synchronize: false,
      }),
    }),
    AuthModule,
    UsuariosModule,
    UploadModule,
    EntregasModule,
    SuperAdminModule,
  ],
})
export class AppModule {}
