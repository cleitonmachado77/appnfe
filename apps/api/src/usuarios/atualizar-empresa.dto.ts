import { IsString, IsOptional, IsEmail, MaxLength, MinLength } from 'class-validator';

export class AtualizarEmpresaDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(255)
  razao_social?: string;

  @IsOptional() @IsString() @MaxLength(255)
  nome_fantasia?: string;

  @IsOptional() @IsString() @MaxLength(18)
  cnpj?: string;

  @IsOptional() @IsString() @MaxLength(20)
  inscricao_estadual?: string;

  @IsOptional() @IsString() @MaxLength(100)
  segmento?: string;

  @IsOptional() @IsEmail()
  email_contato?: string;

  @IsOptional() @IsString() @MaxLength(20)
  telefone?: string;

  @IsOptional() @IsString() @MaxLength(20)
  celular?: string;

  @IsOptional() @IsString() @MaxLength(255)
  site?: string;

  @IsOptional() @IsString() @MaxLength(9)
  cep?: string;

  @IsOptional() @IsString() @MaxLength(255)
  logradouro?: string;

  @IsOptional() @IsString() @MaxLength(20)
  numero?: string;

  @IsOptional() @IsString() @MaxLength(100)
  complemento?: string;

  @IsOptional() @IsString() @MaxLength(100)
  bairro?: string;

  @IsOptional() @IsString() @MaxLength(100)
  cidade?: string;

  @IsOptional() @IsString() @MaxLength(2)
  uf?: string;

  @IsOptional() @IsString() @MaxLength(255)
  responsavel_nome?: string;

  @IsOptional() @IsEmail()
  responsavel_email?: string;

  @IsOptional() @IsString() @MaxLength(20)
  responsavel_telefone?: string;

  @IsOptional() @IsString() @MaxLength(14)
  responsavel_cpf?: string;
}
