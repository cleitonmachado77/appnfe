import {
  IsString,
  IsNumber,
  IsArray,
  IsUrl,
  IsOptional,
  IsEnum,
  Min,
  Max,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { StatusEntrega } from '../entities/entrega.entity';

export class ImagemEntregaDto {
  @IsString()
  @IsUrl()
  url_arquivo!: string;

  /** Chave do campo (ex: "CANHOTO", "LOCAL", "RECEITUARIO") */
  @IsString()
  tipo!: string;
}

export class CriarEntregaDto {
  @IsString()
  @Matches(/^\d{44}$/, {
    message: 'Chave NF-e deve conter exatamente 44 dígitos numéricos',
  })
  chave_nfe!: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ImagemEntregaDto)
  imagens?: ImagemEntregaDto[];

  /** Se PENDENTE, salva como rascunho sem validar imagens obrigatórias */
  @IsOptional()
  @IsEnum(StatusEntrega)
  status?: StatusEntrega;

  /** Chaves de campos obrigatórios que o entregador declarou ausentes nesta entrega */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  campos_ausentes?: string[];
}

export class FinalizarEntregaDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImagemEntregaDto)
  imagens!: ImagemEntregaDto[];

  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;

  /** Chaves de campos obrigatórios que o entregador declarou ausentes nesta entrega */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  campos_ausentes?: string[];

  /** Indica que o entregador está enviando a entrega com informações/imagens faltando */
  @IsOptional()
  parcial?: boolean;
}
