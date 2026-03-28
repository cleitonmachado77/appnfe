export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

/** Wrapper de fetch que trata 401 globalmente — limpa token e redireciona para login */
async function apiFetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
  const res = await fetch(input, init);
  if (res.status === 401 && typeof window !== 'undefined') {
    localStorage.removeItem('token');
    localStorage.removeItem('perfil');
    localStorage.removeItem('nome');
    window.location.href = '/login';
  }
  return res;
}

export interface AuthResponse {
  token: string;
  perfil: 'ENTREGADOR' | 'ADMIN' | 'SUPER_ADMIN';
  nome: string;
}

export async function login(email: string, senha: string): Promise<AuthResponse> {
  const res = await apiFetch(`${API_URL}/auth/login`, {
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

  const res = await apiFetch(`${API_URL}/upload`, {
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
  tipo: string;
}

export interface CriarEntregaDto {
  chave_nfe: string;
  latitude: number;
  longitude: number;
  imagens: ImagemEntregaDto[];
  status?: 'PENDENTE' | 'ENVIADO';
  campos_ausentes?: string[];
}

export interface DadosNfe {
  emit_nome: string | null;
  emit_cnpj: string | null;
  emit_uf: string | null;
  dest_nome: string | null;
  dest_cnpj_cpf: string | null;
  dest_municipio: string | null;
  dest_uf: string | null;
  numero_nfe: string | null;
  serie: string | null;
  data_emissao: string | null;
  valor_total: number | null;
  valor_produtos: number | null;
  valor_frete: number | null;
  valor_desconto: number | null;
  quantidade_itens: number | null;
  natureza_operacao: string | null;
  transportadora_nome: string | null;
  peso_bruto: number | null;
}

export interface EntregaResponse {
  id: string;
  codigo: string | null;
  chave_nfe: string;
  entregador_id: string;
  entregador_nome: string;
  data_hora: string;
  latitude: number;
  longitude: number;
  status: 'ENVIADO' | 'PENDENTE' | 'ERRO';
  conferida: boolean;
  conferida_em?: string | null;
  imagens: { id: string; tipo: string | null; campo_key?: string | null; url_arquivo: string }[];
  danfe_pdf_base64?: string | null;
  dados_nfe?: DadosNfe | null;
  comentario_reativacao?: string | null;
  campos_ausentes?: string[] | null;
  parcial?: boolean;
}

export async function conferirEntrega(id: string, conferida: boolean, token: string): Promise<void> {
  const res = await apiFetch(`${API_URL}/entregas/${id}/conferir`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ conferida }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.message ?? 'Erro ao conferir entrega');
  }
}

export async function criarEntrega(
  dados: CriarEntregaDto,
  token: string,
): Promise<EntregaResponse> {
  const res = await apiFetch(`${API_URL}/entregas`, {
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

export async function listarMinhasPendentes(token: string): Promise<EntregaResponse[]> {
  const res = await apiFetch(`${API_URL}/entregas/minhas-pendentes`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Erro ao carregar pendentes');
  return res.json();
}

export async function finalizarEntrega(
  id: string,
  dados: { imagens: ImagemEntregaDto[]; latitude: number; longitude: number; campos_ausentes?: string[]; parcial?: boolean },
  token: string,
): Promise<EntregaResponse> {
  const res = await apiFetch(`${API_URL}/entregas/${id}/finalizar`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(dados),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.message ?? 'Erro ao finalizar entrega');
  }
  return res.json();
}

export async function excluirEntregaPendente(id: string, token: string): Promise<void> {
  const res = await apiFetch(`${API_URL}/entregas/${id}/pendente`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.message ?? 'Erro ao excluir entrega');
  }
}

// ---- Transferências ----

export interface ColегaResponse { id: string; nome: string; }

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

export async function listarColegas(token: string): Promise<{ id: string; nome: string }[]> {
  const res = await apiFetch(`${API_URL}/transferencias/colegas`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Erro ao carregar colegas');
  return res.json();
}

export async function solicitarTransferencia(
  entregaId: string,
  destinatarioId: string,
  mensagem: string | undefined,
  token: string,
): Promise<TransferenciaResponse> {
  const res = await apiFetch(`${API_URL}/transferencias/${entregaId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ destinatario_id: destinatarioId, mensagem }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.message ?? 'Erro ao solicitar transferência');
  }
  return res.json();
}

export async function listarTransferenciasRecebidas(token: string): Promise<TransferenciaResponse[]> {
  const res = await apiFetch(`${API_URL}/transferencias/recebidas`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Erro ao carregar transferências');
  return res.json();
}

export async function listarTransferenciasEnviadas(token: string): Promise<TransferenciaResponse[]> {
  const res = await apiFetch(`${API_URL}/transferencias/enviadas`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Erro ao carregar transferências enviadas');
  return res.json();
}

export async function responderTransferencia(
  id: string,
  acao: 'aceitar' | 'recusar' | 'cancelar',
  token: string,
): Promise<void> {
  await apiFetch(`${API_URL}/transferencias/${id}/${acao}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  });
}

// ---- Admin: Listagem e detalhe ----

export interface FiltrosEntrega {
  entregador_id?: string;
  data_inicio?: string;
  data_fim?: string;
  chave_nfe?: string;
  cliente_cnpj?: string;
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
  if (filtros.cliente_cnpj) params.set('cliente_cnpj', filtros.cliente_cnpj);
  if (filtros.page) params.set('page', String(filtros.page));
  if (filtros.limit) params.set('limit', String(filtros.limit));

  const res = await apiFetch(`${API_URL}/entregas?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.mensagem ?? 'Erro ao listar entregas');
  }

  return res.json();
}

export async function buscarEntrega(id: string, token: string): Promise<EntregaResponse> {
  const res = await apiFetch(`${API_URL}/entregas/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.mensagem ?? 'Entrega não encontrada');
  }

  return res.json();
}

export async function reprocessarDanfe(
  id: string,
  token: string,
): Promise<{ danfe_pdf_base64: string | null }> {
  const res = await apiFetch(`${API_URL}/entregas/${id}/danfe`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.mensagem ?? 'Erro ao reprocessar DANFE');
  }

  return res.json();
}

export async function reativarEntrega(id: string, comentario: string | undefined, token: string): Promise<void> {
  const res = await apiFetch(`${API_URL}/entregas/${id}/reativar`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ comentario }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.message ?? 'Erro ao reativar entrega');
  }
}

export async function excluirImagemEntrega(imagemId: string, token: string): Promise<void> {
  const res = await apiFetch(`${API_URL}/entregas/imagens/${imagemId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.message ?? 'Erro ao excluir imagem');
  }
}

export async function limparCamposEntrega(
  id: string,
  campos: { chave_nfe?: boolean; localizacao?: boolean },
  token: string,
): Promise<void> {
  const res = await apiFetch(`${API_URL}/entregas/${id}/limpar-campos`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(campos),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.message ?? 'Erro ao limpar campos');
  }
}

export interface NotificacaoResponse {
  id: string;
  tipo: 'REATIVACAO' | 'TRANSFERENCIA' | 'MIGRACAO';
  mensagem: string;
  entrega_id: string | null;
  lida: boolean;
  criado_em: string;
}

export async function listarNotificacoes(token: string): Promise<NotificacaoResponse[]> {
  const res = await apiFetch(`${API_URL}/notificacoes`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Erro ao carregar notificações');
  return res.json();
}

export async function contarNotificacoesNaoLidas(token: string): Promise<number> {
  const res = await apiFetch(`${API_URL}/notificacoes/nao-lidas`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return 0;
  const data = await res.json();
  return data.count ?? 0;
}

export async function marcarNotificacaoLida(id: string, token: string): Promise<void> {
  await apiFetch(`${API_URL}/notificacoes/${id}/lida`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function marcarTodasNotificacoesLidas(token: string): Promise<void> {
  await apiFetch(`${API_URL}/notificacoes/todas/lidas`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export interface UsuarioResponse {
  id: string;
  nome: string;
  email: string;
  criado_em?: string;
  ativo?: boolean;
  inativado_em?: string | null;
}

export async function listarUsuarios(token: string): Promise<UsuarioResponse[]> {
  const res = await apiFetch(`${API_URL}/usuarios`, {
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
  const res = await apiFetch(`${API_URL}/usuarios`, {
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

// ---- Dashboard ----

export interface DashboardData {
  kpis: {
    totalEntregas: number;
    valorTotal: number;
    ticketMedio: number;
    nfeUnicas: number;
    entregasPorStatus: { status: string; count: number }[];
    pesoTotal: number;
    tempoMedioHoras: number;
  };
  entregasPorPeriodo: { data: string; count: number }[];
  entregasPorEntregador: { nome: string; count: number; valor: number }[];
  entregasPorStatus: { status: string; count: number }[];
  faturamentoPorPeriodo: { data: string; valor: number }[];
  distribuicaoValores: { faixa: string; count: number }[];
  composicaoValores: { produtos: number; frete: number; desconto: number };
  topEmitentes: { nome: string; cnpj: string; count: number; valor: number }[];
  topDestinatarios: { nome: string; cnpj_cpf: string; count: number; valor: number }[];
  notasPorUf: {
    emitente: { uf: string; count: number }[];
    destinatario: { uf: string; count: number }[];
  };
  naturezaOperacao: { natureza: string; count: number }[];
  itensPorNota: { faixa: string; count: number }[];
  tempoPorPeriodo: { data: string; horas: number }[];
  valorPorEntregador: { nome: string; valor: number; count: number }[];
  entregas: { lat: number; lng: number; valor: number; dest_nome: string; chave_nfe: string }[];
}

export async function getClientesDashboard(token: string): Promise<{ cnpj: string; nome: string }[]> {
  const res = await apiFetch(`${API_URL}/dashboard/clientes`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Erro ao carregar clientes');
  return res.json();
}

export async function getDashboard(token: string, filtros?: { data_inicio?: string; data_fim?: string; cliente_cnpj?: string; entregador_id?: string }): Promise<DashboardData> {
  const params = new URLSearchParams();
  if (filtros?.data_inicio) params.set('data_inicio', filtros.data_inicio);
  if (filtros?.data_fim) params.set('data_fim', filtros.data_fim);
  if (filtros?.cliente_cnpj) params.set('cliente_cnpj', filtros.cliente_cnpj);
  if (filtros?.entregador_id) params.set('entregador_id', filtros.entregador_id);
  const query = params.toString() ? `?${params.toString()}` : '';
  const res = await apiFetch(`${API_URL}/dashboard${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Erro ao carregar dashboard');
  return res.json();
}

// ---- Super Admin ----

export interface EmpresaResponse {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string;
  inscricao_estadual: string | null;
  segmento: string | null;
  email_contato: string;
  telefone: string | null;
  celular: string | null;
  site: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  responsavel_nome: string;
  responsavel_email: string;
  responsavel_telefone: string | null;
  responsavel_cpf: string | null;
  plano: string | null;
  status: 'ATIVA' | 'INATIVA' | 'SUSPENSA';
  observacoes: string | null;
  criado_em: string;
  totalUsuarios?: number;
  totalEntregas?: number;
}

export interface StatsGlobais {
  totalEmpresas: number;
  totalAdmins: number;
  totalEntregas: number;
  valorMovimentado: number;
  empresasPorStatus: { status: string; count: number }[];
  entregasPorMes: { mes: string; count: number }[];
}

export async function cadastrarEmpresa(dto: Record<string, string>, token: string): Promise<{ empresa: EmpresaResponse }> {
  const res = await apiFetch(`${API_URL}/super-admin/empresas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(dto),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.message ?? 'Erro ao cadastrar empresa');
  }
  return res.json();
}

export async function listarEmpresas(token: string): Promise<EmpresaResponse[]> {
  const res = await apiFetch(`${API_URL}/super-admin/empresas`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Erro ao listar empresas');
  return res.json();
}

export async function buscarEmpresa(id: string, token: string): Promise<EmpresaResponse> {
  const res = await apiFetch(`${API_URL}/super-admin/empresas/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Empresa não encontrada');
  return res.json();
}

export async function atualizarStatusEmpresa(id: string, status: string, token: string): Promise<EmpresaResponse> {
  const res = await apiFetch(`${API_URL}/super-admin/empresas/${id}/status?status=${status}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Erro ao atualizar status');
  return res.json();
}

export async function getStatsGlobais(token: string): Promise<StatsGlobais> {
  const res = await apiFetch(`${API_URL}/super-admin/stats`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Erro ao carregar stats');
  return res.json();
}

export async function getMinhaContaInfo(token: string): Promise<{ id: string; nome: string; email: string; tipo: string; empresa_id: string | null; criado_em: string }> {
  const res = await apiFetch(`${API_URL}/usuarios/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Erro ao carregar conta');
  return res.json();
}

export async function atualizarMinhaEmpresa(dados: Record<string, string | null>, token: string): Promise<Record<string, any>> {
  const res = await apiFetch(`${API_URL}/usuarios/minha-empresa`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(dados),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.message ?? 'Erro ao atualizar empresa');
  }
  return res.json();
}

export async function atualizarMeuPerfil(dados: { nome?: string; email?: string; senha_atual?: string; nova_senha?: string }, token: string): Promise<Record<string, any>> {
  const res = await apiFetch(`${API_URL}/usuarios/me`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(dados),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.message ?? 'Erro ao atualizar perfil');
  }
  return res.json();
}

// ---- Audit Logs ----

export interface AuditLogEntry {
  id: string;
  usuario_id: string | null;
  usuario_nome: string | null;
  usuario_email: string | null;
  empresa_id: string | null;
  acao: string;
  recurso: string | null;
  recurso_id: string | null;
  descricao: string | null;
  metodo_http: string | null;
  rota: string | null;
  status_http: number | null;
  criado_em: string;
}

export async function listarLogs(token: string, page = 1, limit = 50): Promise<{ data: AuditLogEntry[]; total: number; page: number; limit: number }> {
  const res = await apiFetch(`${API_URL}/audit?page=${page}&limit=${limit}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Erro ao carregar logs');
  return res.json();
}

export function getAuditExportUrl(): string {
  return `${API_URL}/audit/exportar`;
}

export async function excluirEntregador(id: string, token: string): Promise<void> {
  const res = await apiFetch(`${API_URL}/usuarios/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.mensagem ?? 'Erro ao excluir entregador');
  }
}

export async function excluirEntregadorPermanente(id: string, token: string): Promise<void> {
  const res = await apiFetch(`${API_URL}/usuarios/${id}/permanente`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.message ?? 'Erro ao excluir entregador permanentemente');
  }
}

export async function reativarEntregador(id: string, token: string): Promise<void> {
  const res = await apiFetch(`${API_URL}/usuarios/${id}/reativar`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.mensagem ?? 'Erro ao reativar entregador');
  }
}

export async function alterarSenhaEntregador(id: string, nova_senha: string, token: string): Promise<void> {
  const res = await apiFetch(`${API_URL}/usuarios/${id}/senha`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ nova_senha }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.message ?? 'Erro ao alterar senha');
  }
}

export async function contarPendenciasEntregador(id: string, token: string): Promise<{ entregas_pendentes: number; transferencias_pendentes: number }> {
  const res = await apiFetch(`${API_URL}/usuarios/${id}/pendencias`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Erro ao carregar pendências');
  return res.json();
}

export async function migrarEntregador(id: string, destino_id: string, token: string): Promise<{ entregas_migradas: number; transferencias_migradas: number }> {
  const res = await apiFetch(`${API_URL}/usuarios/${id}/migrar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ destino_id }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.message ?? 'Erro ao migrar responsabilidades');
  }
  return res.json();
}

export async function excluirEntrega(id: string, token: string): Promise<void> {
  const res = await apiFetch(`${API_URL}/entregas/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.mensagem ?? 'Erro ao excluir entrega');
  }
}

// ---- Campos de Imagem ----

// ---- Usuários Admin ----

export interface AdminUsuarioResponse {
  id: string;
  nome: string;
  email: string;
  cargo?: string | null;
  criado_em?: string;
  ativo?: boolean;
  inativado_em?: string | null;
}

export async function listarAdmins(token: string): Promise<AdminUsuarioResponse[]> {
  const res = await apiFetch(`${API_URL}/usuarios/admins`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.mensagem ?? 'Erro ao listar usuários admin');
  }
  return res.json();
}

export async function criarAdmin(
  dados: { nome: string; email: string; senha: string; cargo?: string },
  token: string,
): Promise<AdminUsuarioResponse> {
  const res = await apiFetch(`${API_URL}/usuarios/admins`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(dados),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.mensagem ?? 'Erro ao criar usuário admin');
  }
  return res.json();
}

export async function inativarAdmin(id: string, token: string): Promise<void> {
  const res = await apiFetch(`${API_URL}/usuarios/admins/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.mensagem ?? 'Erro ao inativar usuário');
  }
}

export async function reativarAdmin(id: string, token: string): Promise<void> {
  const res = await apiFetch(`${API_URL}/usuarios/admins/${id}/reativar`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.mensagem ?? 'Erro ao reativar usuário');
  }
}

export async function alterarSenhaAdmin(id: string, nova_senha: string, token: string): Promise<void> {
  const res = await apiFetch(`${API_URL}/usuarios/admins/${id}/senha`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ nova_senha }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.mensagem ?? 'Erro ao alterar senha');
  }
}

// ---- Campos de Imagem (continuação) ----

export interface CampoImagemResponse {
  id: string;
  key: string;
  label: string;
  obrigatorio: boolean;
  ordem: number;
  ativo: boolean;
}

export async function listarCamposImagem(token: string): Promise<CampoImagemResponse[]> {
  const res = await apiFetch(`${API_URL}/campos-imagem`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Erro ao listar campos');
  return res.json();
}

export async function listarCamposImagemAtivos(token: string): Promise<CampoImagemResponse[]> {
  const res = await apiFetch(`${API_URL}/campos-imagem/meus`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Erro ao carregar campos');
  return res.json();
}

export async function criarCampoImagem(
  dto: { key: string; label: string; obrigatorio: boolean; ordem: number },
  token: string,
): Promise<CampoImagemResponse> {
  const res = await apiFetch(`${API_URL}/campos-imagem`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(dto),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.message ?? 'Erro ao criar campo');
  }
  return res.json();
}

export async function atualizarCampoImagem(
  id: string,
  dto: { label?: string; obrigatorio?: boolean; ordem?: number; ativo?: boolean },
  token: string,
): Promise<CampoImagemResponse> {
  const res = await apiFetch(`${API_URL}/campos-imagem/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(dto),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.message ?? 'Erro ao atualizar campo');
  }
  return res.json();
}

export async function excluirCampoImagem(id: string, token: string): Promise<void> {
  const res = await apiFetch(`${API_URL}/campos-imagem/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.message ?? 'Erro ao excluir campo');
  }
}

// ---- NF-e Emitidas ----

export interface NfeEmitidaResponse {
  id: string;
  empresa_id: string;
  chave_nfe: string;
  numero_nfe: string | null;
  serie: string | null;
  dest_nome: string | null;
  dest_cnpj_cpf: string | null;
  dest_municipio: string | null;
  dest_uf: string | null;
  valor_total: number | null;
  data_emissao: string | null;
  natureza_operacao: string | null;
  status: 'PENDENTE' | 'COMPLETA' | 'CANCELADA' | 'ERRO';
  nsu: string | null;
  danfe_pdf_base64: string | null;
  entrega_chave_nfe: string | null;
  criado_em: string;
}

export interface ListaNfeEmitidas {
  data: NfeEmitidaResponse[];
  total: number;
  page: number;
  limit: number;
}

export interface CruzamentoResponse {
  com_entrega: Record<string, unknown>[];
  sem_entrega: NfeEmitidaResponse[];
  total_com_entrega: number;
  total_sem_entrega: number;
}

export interface CertificadoInfo {
  configurado: boolean;
  titular: string | null;
  validade: string | null;
  vencido: boolean;
}

export async function listarNfeEmitidas(
  token: string,
  filtros?: {
    page?: number; limit?: number; status?: string;
    data_inicio?: string; data_fim?: string;
    dest_cnpj?: string; chave_nfe?: string;
  },
): Promise<ListaNfeEmitidas> {
  const params = new URLSearchParams();
  if (filtros?.page) params.set('page', String(filtros.page));
  if (filtros?.limit) params.set('limit', String(filtros.limit));
  if (filtros?.status) params.set('status', filtros.status);
  if (filtros?.data_inicio) params.set('data_inicio', filtros.data_inicio);
  if (filtros?.data_fim) params.set('data_fim', filtros.data_fim);
  if (filtros?.dest_cnpj) params.set('dest_cnpj', filtros.dest_cnpj);
  if (filtros?.chave_nfe) params.set('chave_nfe', filtros.chave_nfe);
  const res = await apiFetch(`${API_URL}/nfe-emitidas?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Erro ao listar NF-e emitidas');
  return res.json();
}

export async function getCruzamentoNfe(token: string): Promise<CruzamentoResponse> {
  const res = await apiFetch(`${API_URL}/nfe-emitidas/cruzamento`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Erro ao carregar cruzamento');
  return res.json();
}

export async function dispararCaptura(token: string): Promise<{ message: string; cStat?: string; documentos?: number }> {
  const res = await apiFetch(`${API_URL}/nfe-emitidas/capturar`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.message ?? 'Erro ao capturar NF-e');
  }
  return res.json();
}

export async function getControleNsu(token: string): Promise<{ ult_nsu: string; max_nsu: string | null; atualizado_em: string } | null> {
  const res = await apiFetch(`${API_URL}/nfe-emitidas/controle-nsu`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return res.json();
}

export async function getCertificadoInfo(token: string): Promise<CertificadoInfo> {
  const res = await apiFetch(`${API_URL}/certificado`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Erro ao carregar certificado');
  return res.json();
}

export async function uploadCertificado(
  token: string,
  file: File,
  senha: string,
): Promise<{ titular: string; validade: string }> {
  const form = new FormData();
  form.append('certificado', file);
  form.append('senha', senha);
  const res = await apiFetch(`${API_URL}/certificado`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.message ?? 'Erro ao enviar certificado');
  }
  return res.json();
}

export async function removerCertificado(token: string): Promise<void> {
  await apiFetch(`${API_URL}/certificado`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
}
