export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export interface AuthResponse {
  token: string;
  perfil: 'ENTREGADOR' | 'ADMIN';
  nome: string;
}

export async function login(email: string, senha: string): Promise<AuthResponse> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, senha }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.mensagem ?? 'Email ou senha inválidos');
  }

  return res.json();
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

export function getPerfil(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('perfil');
}

export function setToken(token: string, perfil: string, nome: string): void {
  localStorage.setItem('token', token);
  localStorage.setItem('perfil', perfil);
  localStorage.setItem('nome', nome);
}

export function clearToken(): void {
  localStorage.removeItem('token');
  localStorage.removeItem('perfil');
  localStorage.removeItem('nome');
}

// ---- Upload ----

export async function uploadImagem(
  file: File,
  token: string,
): Promise<{ url_arquivo: string }> {
  const form = new FormData();
  form.append('file', file);

  const res = await fetch(`${API_URL}/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.mensagem ?? 'Erro ao fazer upload da imagem');
  }

  return res.json();
}

// ---- Entregas ----

export interface ImagemEntregaDto {
  url_arquivo: string;
  tipo: 'CANHOTO' | 'LOCAL';
}

export interface CriarEntregaDto {
  chave_nfe: string;
  latitude: number;
  longitude: number;
  imagens: ImagemEntregaDto[];
}

export interface EntregaResponse {
  id: string;
  chave_nfe: string;
  entregador_id: string;
  entregador_nome: string;
  data_hora: string;
  latitude: number;
  longitude: number;
  status: 'ENVIADO' | 'PENDENTE' | 'ERRO';
  imagens: { id: string; tipo: 'CANHOTO' | 'LOCAL'; url_arquivo: string }[];
}

export async function criarEntrega(
  dados: CriarEntregaDto,
  token: string,
): Promise<EntregaResponse> {
  const res = await fetch(`${API_URL}/entregas`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(dados),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.mensagem ?? 'Erro ao registrar entrega');
  }

  return res.json();
}

// ---- Admin: Listagem e detalhe ----

export interface FiltrosEntrega {
  entregador_id?: string;
  data_inicio?: string;
  data_fim?: string;
  chave_nfe?: string;
  page?: number;
  limit?: number;
}

export interface ListaEntregasResponse {
  data: EntregaResponse[];
  total: number;
  page: number;
  limit: number;
}

export async function listarEntregas(
  filtros: FiltrosEntrega,
  token: string,
): Promise<ListaEntregasResponse> {
  const params = new URLSearchParams();
  if (filtros.entregador_id) params.set('entregador_id', filtros.entregador_id);
  if (filtros.data_inicio) params.set('data_inicio', filtros.data_inicio);
  if (filtros.data_fim) params.set('data_fim', filtros.data_fim);
  if (filtros.chave_nfe) params.set('chave_nfe', filtros.chave_nfe);
  if (filtros.page) params.set('page', String(filtros.page));
  if (filtros.limit) params.set('limit', String(filtros.limit));

  const res = await fetch(`${API_URL}/entregas?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.mensagem ?? 'Erro ao listar entregas');
  }

  return res.json();
}

export async function buscarEntrega(id: string, token: string): Promise<EntregaResponse> {
  const res = await fetch(`${API_URL}/entregas/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.mensagem ?? 'Entrega não encontrada');
  }

  return res.json();
}

export interface UsuarioResponse {
  id: string;
  nome: string;
  email: string;
  criado_em?: string;
}

export async function listarUsuarios(token: string): Promise<UsuarioResponse[]> {
  const res = await fetch(`${API_URL}/usuarios`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.mensagem ?? 'Erro ao listar usuários');
  }

  return res.json();
}

export async function criarUsuario(
  dados: { nome: string; email: string; senha: string },
  token: string,
): Promise<UsuarioResponse> {
  const res = await fetch(`${API_URL}/usuarios`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(dados),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.mensagem ?? 'Erro ao criar entregador');
  }

  return res.json();
}
