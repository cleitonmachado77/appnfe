export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export interface AuthResponse {
  token: string;
  perfil: 'ENTREGADOR' | 'ADMIN' | 'SUPER_ADMIN';
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
  chave_nfe: string;
  entregador_id: string;
  entregador_nome: string;
  data_hora: string;
  latitude: number;
  longitude: number;
  status: 'ENVIADO' | 'PENDENTE' | 'ERRO';
  imagens: { id: string; tipo: 'CANHOTO' | 'LOCAL'; url_arquivo: string }[];
  danfe_pdf_base64?: string | null;
  dados_nfe?: DadosNfe | null;
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

export async function reprocessarDanfe(
  id: string,
  token: string,
): Promise<{ danfe_pdf_base64: string | null }> {
  const res = await fetch(`${API_URL}/entregas/${id}/danfe`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.mensagem ?? 'Erro ao reprocessar DANFE');
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
  const res = await fetch(`${API_URL}/dashboard/clientes`, {
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
  const res = await fetch(`${API_URL}/dashboard${query}`, {
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
  const res = await fetch(`${API_URL}/super-admin/empresas`, {
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
  const res = await fetch(`${API_URL}/super-admin/empresas`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Erro ao listar empresas');
  return res.json();
}

export async function buscarEmpresa(id: string, token: string): Promise<EmpresaResponse> {
  const res = await fetch(`${API_URL}/super-admin/empresas/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Empresa não encontrada');
  return res.json();
}

export async function atualizarStatusEmpresa(id: string, status: string, token: string): Promise<EmpresaResponse> {
  const res = await fetch(`${API_URL}/super-admin/empresas/${id}/status?status=${status}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Erro ao atualizar status');
  return res.json();
}

export async function getStatsGlobais(token: string): Promise<StatsGlobais> {
  const res = await fetch(`${API_URL}/super-admin/stats`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Erro ao carregar stats');
  return res.json();
}

export async function getMinhaContaInfo(token: string): Promise<{ id: string; nome: string; email: string; tipo: string; empresa_id: string | null; criado_em: string }> {
  const res = await fetch(`${API_URL}/usuarios/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Erro ao carregar conta');
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
  const res = await fetch(`${API_URL}/audit?page=${page}&limit=${limit}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Erro ao carregar logs');
  return res.json();
}

export function getAuditExportUrl(): string {
  return `${API_URL}/audit/exportar`;
}

export async function excluirEntregador(id: string, token: string): Promise<void> {
  const res = await fetch(`${API_URL}/usuarios/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.mensagem ?? 'Erro ao excluir entregador');
  }
}

export async function excluirEntrega(id: string, token: string): Promise<void> {
  const res = await fetch(`${API_URL}/entregas/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.mensagem ?? 'Erro ao excluir entrega');
  }
}
