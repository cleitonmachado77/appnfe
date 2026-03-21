import {
  IsString,
  IsNumber,
  IsArray,
  IsEnum,
  IsUrl,
  Min,
  Max,
  Matches,
  ArrayMinSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TipoImagem } from '../entities';

export class ImagemEntregaDto {
  @IsString()
  @IsUrl()
  url_arquivo!: string;

  @IsEnum(TipoImagem)
  tipo!: TipoImagem;
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
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => ImagemEntregaDto)
  imagens!: ImagemEntregaDto[];
}
