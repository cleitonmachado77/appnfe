// Shared types for nfe-delivery-proof

export type PerfilUsuario = 'ENTREGADOR' | 'ADMIN';
export type StatusEntrega = 'ENVIADO' | 'PENDENTE' | 'ERRO';
export type TipoImagem = 'CANHOTO' | 'LOCAL';

export interface LoginDto {
  email: string;
  senha: string;
}

export interface AuthResponse {
  token: string;
  perfil: PerfilUsuario;
  nome: string;
}

export interface JwtPayload {
  sub: string;
  perfil: PerfilUsuario;
  iat: number;
  exp: number;
}

export interface ImagemEntregaDto {
  url_arquivo: string;
  tipo: TipoImagem;
}

export interface CriarEntregaDto {
  chave_nfe: string;
  latitude: number;
  longitude: number;
  imagens: ImagemEntregaDto[];
}

export interface ImagemResponse {
  id: string;
  tipo: TipoImagem;
  url_arquivo: string;
  criado_em: string;
}

export interface EntregaResponse {
  id: string;
  chave_nfe: string;
  entregador_id: string;
  entregador_nome: string;
  data_hora: string;
  latitude: number;
  longitude: number;
  status: StatusEntrega;
  imagens: ImagemResponse[];
}

export interface FiltrosEntregaQuery {
  entregador_id?: string;
  data_inicio?: string;
  data_fim?: string;
  chave_nfe?: string;
  page?: number;
  limit?: number;
}

export interface UploadResponse {
  url_arquivo: string;
  tipo: TipoImagem;
}

export interface CriarUsuarioDto {
  nome: string;
  email: string;
  senha: string;
}

export interface UsuarioResponse {
  id: string;
  nome: string;
  email: string;
  tipo: PerfilUsuario;
  criado_em: string;
}

export interface ApiError {
  statusCode: number;
  mensagem: string;
  campo?: string;
}
