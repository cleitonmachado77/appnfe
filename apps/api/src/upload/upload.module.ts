import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { UploadController } from './upload.controller';

const TAMANHO_MAXIMO = 10 * 1024 * 1024; // 10 MB

@Module({
  imports: [
    MulterModule.register({
      limits: { fileSize: TAMANHO_MAXIMO },
    }),
  ],
  providers: [UploadService],
  controllers: [UploadController],
})
export class UploadModule {}
