import { IsString, IsOptional, IsEmail, MinLength, MaxLength } from 'class-validator';

export class AtualizarPerfilDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(255)
  nome?: string;

  @IsOptional() @IsEmail()
  email?: string;

  @IsOptional() @IsString() @MinLength(8)
  senha_atual?: string;

  @IsOptional() @IsString() @MinLength(8)
  nova_senha?: string;
}
