import { API_URL } from '../constants';
import { getAuthToken } from '../hooks/useAuth';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AuthResponse {
  token: string;
  perfil: 'ENTREGADOR' | 'ADMIN' | 'SUPER_ADMIN';
  nome: string;
}

export interface ImagemEntregaDto {
  url_arquivo: string;
  tipo: string;
}

export interface CriarEntregaPayload {
  chave_nfe: string;
  latitude: number;
  longitude: number;
  imagens: ImagemEntregaDto[];
  status?: 'PENDENTE' | 'ENVIADO';
  campos_ausentes?: string[];
}

export interface FinalizarEntregaPayload {
  imagens: ImagemEntregaDto[];
  latitude: number;
  longitude: number;
  campos_ausentes?: string[];
  parcial?: boolean;
}

export interface CampoImagemResponse {
  id: string;
  key: string;
  label: string;
  obrigatorio: boolean;
  ordem: number;
  ativo: boolean;
}

export interface EntregaResponse {
  id: string;
  codigo: string | null;
  chave_nfe: string;
  entregador_id: string;
  data_hora: string;
  latitude: number;
  longitude: number;
  status: 'ENVIADO' | 'PENDENTE' | 'ERRO';
  conferida: boolean;
  imagens: { id: string; tipo: string | null; campo_key?: string | null; url_arquivo: string }[];
  comentario_reativacao?: string | null;
  campos_ausentes?: string[] | null;
  parcial?: boolean;
}

export interface TransferenciaResponse {
  id: string;
  entrega_id: string;
  remetente_id: string;
  destinatario_id: string;
  status: 'PENDENTE' | 'ACEITA' | 'RECUSADA';
  mensagem: string | null;
  criado_em: string;
  entrega?: EntregaResponse;
  remetente?: { id: string; nome: string };
  destinatario?: { id: string; nome: string };
}

export interface NotificacaoResponse {
  id: string;
  tipo: string;
  mensagem: string;
  lida: boolean;
  criado_em: string;
  entrega_id: string | null;
}

// ─── Fetch helper ────────────────────────────────────────────────────────────

async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API_URL}${path}`, init);
}

function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export async function apiLogin(email: string, senha: string): Promise<AuthResponse> {
  const res = await apiFetch('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, senha }),
  });
  if (!res.ok) throw new Error('Credenciais inválidas');
  return res.json();
}

// ─── Upload ──────────────────────────────────────────────────────────────────

export async function apiUploadImagem(fileUri: string, token: string): Promise<{ url_arquivo: string }> {
  const formData = new FormData();
  const filename = fileUri.split('/').pop() ?? 'photo.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1] === 'jpg' ? 'jpeg' : match[1]}` : 'image/jpeg';
  formData.append('file', { uri: fileUri, name: filename, type } as any);

  const res = await apiFetch('/upload', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) throw new Error('Erro ao fazer upload');
  return res.json();
}

// ─── Entregas ────────────────────────────────────────────────────────────────

export async function apiCriarEntrega(payload: CriarEntregaPayload, token: string): Promise<EntregaResponse> {
  const res = await apiFetch('/entregas', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.message ?? 'Erro ao criar entrega');
  }
  return res.json();
}

export async function apiListarPendentes(token: string): Promise<EntregaResponse[]> {
  const res = await apiFetch('/entregas/minhas-pendentes', {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error('Erro ao listar pendentes');
  return res.json();
}

export async function apiFinalizarEntrega(
  id: string, payload: FinalizarEntregaPayload, token: string,
): Promise<EntregaResponse> {
  const res = await apiFetch(`/entregas/${id}/finalizar`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Erro ao finalizar entrega');
  return res.json();
}

export async function apiExcluirPendente(id: string, token: string): Promise<void> {
  const res = await apiFetch(`/entregas/${id}/pendente`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error('Erro ao excluir entrega');
}

// ─── Campos Imagem ───────────────────────────────────────────────────────────

export async function apiListarCamposImagem(token: string): Promise<CampoImagemResponse[]> {
  const res = await apiFetch('/campos-imagem/meus', {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error('Erro ao listar campos');
  return res.json();
}

// ─── Transferências ──────────────────────────────────────────────────────────

export async function apiListarColegas(token: string): Promise<{ id: string; nome: string }[]> {
  const res = await apiFetch('/transferencias/colegas', { headers: authHeaders(token) });
  if (!res.ok) throw new Error('Erro ao listar colegas');
  return res.json();
}

export async function apiSolicitarTransferencia(
  entregaId: string, destinatarioId: string, mensagem: string | undefined, token: string,
): Promise<TransferenciaResponse> {
  const res = await apiFetch(`/transferencias/${entregaId}`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ destinatario_id: destinatarioId, mensagem }),
  });
  if (!res.ok) throw new Error('Erro ao solicitar transferência');
  return res.json();
}

export async function apiListarTransferenciasRecebidas(token: string): Promise<TransferenciaResponse[]> {
  const res = await apiFetch('/transferencias/recebidas', { headers: authHeaders(token) });
  if (!res.ok) throw new Error('Erro ao listar transferências');
  return res.json();
}

export async function apiListarTransferenciasEnviadas(token: string): Promise<TransferenciaResponse[]> {
  const res = await apiFetch('/transferencias/enviadas', { headers: authHeaders(token) });
  if (!res.ok) throw new Error('Erro ao listar transferências');
  return res.json();
}

export async function apiResponderTransferencia(
  id: string, acao: 'aceitar' | 'recusar' | 'cancelar', token: string,
): Promise<void> {
  const endpoint = acao === 'cancelar' ? 'cancelar' : acao;
  const res = await apiFetch(`/transferencias/${id}/${endpoint}`, {
    method: 'PATCH',
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(`Erro ao ${acao} transferência`);
}

// ─── Notificações ────────────────────────────────────────────────────────────

export async function apiListarNotificacoes(token: string): Promise<NotificacaoResponse[]> {
  const res = await apiFetch('/notificacoes', { headers: authHeaders(token) });
  if (!res.ok) throw new Error('Erro ao listar notificações');
  return res.json();
}

export async function apiContarNaoLidas(token: string): Promise<number> {
  const res = await apiFetch('/notificacoes/nao-lidas', { headers: authHeaders(token) });
  if (!res.ok) return 0;
  const data = await res.json();
  return data.count ?? 0;
}

export async function apiMarcarTodasLidas(token: string): Promise<void> {
  await apiFetch('/notificacoes/todas/lidas', {
    method: 'PATCH',
    headers: authHeaders(token),
  });
}
