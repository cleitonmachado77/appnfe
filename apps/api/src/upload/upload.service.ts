import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const TAMANHO_MAXIMO = 10 * 1024 * 1024; // 10 MB
const FORMATOS_ACEITOS = ['image/jpeg', 'image/png'];

@Injectable()
export class UploadService {
  constructor(private readonly configService: ConfigService) {}

  async uploadImagem(file: Express.Multer.File): Promise<{ url_arquivo: string }> {
    if (!FORMATOS_ACEITOS.includes(file.mimetype)) {
      throw new BadRequestException(
        'Formato inválido. Apenas image/jpeg e image/png são aceitos',
      );
    }

    if (file.size > TAMANHO_MAXIMO) {
      throw new BadRequestException(
        'Arquivo excede o tamanho máximo permitido de 10 MB',
      );
    }

    const ext = file.mimetype === 'image/jpeg' ? 'jpg' : 'png';
    const nomeArquivo = `${Date.now()}-${randomUUID()}.${ext}`;

    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_KEY');
    const bucket = this.configService.get<string>('SUPABASE_BUCKET') ?? 'entregas';

    const supabase = createClient(supabaseUrl!, supabaseKey!);

    const { error } = await supabase.storage
      .from(bucket)
      .upload(nomeArquivo, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) {
      throw new InternalServerErrorException(
        'Falha ao armazenar imagem no Storage',
      );
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(nomeArquivo);

    return { url_arquivo: data.publicUrl };
  }
}
