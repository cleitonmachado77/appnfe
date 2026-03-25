import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CadastrarEmpresaDto {
  @IsNotEmpty() @IsString() razao_social!: string;
  @IsOptional() @IsString() nome_fantasia?: string;
  @IsNotEmpty() @IsString() cnpj!: string;
  @IsOptional() @IsString() inscricao_estadual?: string;
  @IsOptional() @IsString() segmento?: string;

  @IsNotEmpty() @IsEmail() email_contato!: string;
  @IsOptional() @IsString() telefone?: string;
  @IsOptional() @IsString() celular?: string;
  @IsOptional() @IsString() site?: string;

  @IsOptional() @IsString() cep?: string;
  @IsOptional() @IsString() logradouro?: string;
  @IsOptional() @IsString() numero?: string;
  @IsOptional() @IsString() complemento?: string;
  @IsOptional() @IsString() bairro?: string;
  @IsOptional() @IsString() cidade?: string;
  @IsOptional() @IsString() uf?: string;

  @IsNotEmpty() @IsString() responsavel_nome!: string;
  @IsNotEmpty() @IsEmail() responsavel_email!: string;
  @IsOptional() @IsString() responsavel_telefone?: string;
  @IsOptional() @IsString() responsavel_cpf?: string;

  @IsOptional() @IsString() plano?: string;
  @IsOptional() @IsString() observacoes?: string;

  // Credenciais do admin da empresa
  @IsNotEmpty() @IsString() admin_nome!: string;
  @IsNotEmpty() @IsEmail() admin_email!: string;
  @IsNotEmpty() @IsString() admin_senha!: string;
}
