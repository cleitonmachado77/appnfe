'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  getToken, listarEntregas, listarUsuarios, getClientesDashboard, excluirEntrega,
  type EntregaResponse, type UsuarioResponse, type FiltrosEntrega,
} from '@/lib/api';
import { colors, fonts, radius } from '@/lib/brand';

export default function EntregasPage() {
  const router = useRouter();
  const [entregas, setEntregas] = useState<EntregaResponse[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioResponse[]>([]);
  const [clientes, setClientes] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [entregadorId, setEntregadorId] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [chaveNfe, setChaveNfe] = useState('');
  const [cliente, setCliente] = useState('');
  const [page, setPage] = useState(1);
  const [excluindo, setExcluindo] = useState<string | null>(null);
  const LIMIT = 20;

  const buscar = useCallback(async (filtros: FiltrosEntrega) => {
    const token = getToken();
    if (!token) { router.replace('/login'); return; }
    setCarregando(true); setErro('');
    try {
      const res = await listarEntregas(filtros, token);
      setEntregas(res.data); setTotal(res.total);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar entregas');
    } finally { setCarregando(false); }
  }, [router]);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    listarUsuarios(token).then(setUsuarios).catch(() => {});
    getClientesDashboard(token).then(setClientes).catch(() => {});
  }, []);

  useEffect(() => { buscar({ page: 1, limit: LIMIT }); }, [buscar]);

  function getFiltrosAtivos(): FiltrosEntrega {
    return { entregador_id: entregadorId || undefined, data_inicio: dataInicio || undefined, data_fim: dataFim || undefined, chave_nfe: chaveNfe || undefined, cliente: cliente || undefined };
  }

  function handleFiltrar(e: React.FormEvent) {
    e.preventDefault(); setPage(1);
    buscar({ ...getFiltrosAtivos(), page: 1, limit: LIMIT });
  }

  function handleLimpar() {
    setEntregadorId(''); setDataInicio(''); setDataFim(''); setChaveNfe(''); setCliente(''); setPage(1);
    buscar({ page: 1, limit: LIMIT });
  }

  function handlePagina(nova: number) {
    setPage(nova);
    buscar({ ...getFiltrosAtivos(), page: nova, limit: LIMIT });
  }

  async function handleExcluir(id: string) {
    if (!confirm('Tem certeza que deseja excluir esta entrega?')) return;
    const token = getToken();
    if (!token) return;
    setExcluindo(id);
    try {
      await excluirEntrega(id, token);
      setEntregas((prev) => prev.filter((e) => e.id !== id));
      setTotal((prev) => prev - 1);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao excluir');
    } finally { setExcluindo(null); }
  }

  const totalPaginas = Math.ceil(total / LIMIT);

  return (
    <div>
      <h1 style={s.titulo}>Entregas</h1>

      {/* Filtros */}
      <form onSubmit={handleFiltrar} style={s.card}>
        <div style={s.filtrosGrid}>
          <div style={s.campo}>
            <label style={s.label}>Entregador</label>
            <select value={entregadorId} onChange={(e) => setEntregadorId(e.target.value)} style={s.input}>
              <option value="">Todos</option>
              {usuarios.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
            </select>
          </div>
          <div style={s.campo}>
            <label style={s.label}>Cliente</label>
            <select value={cliente} onChange={(e) => setCliente(e.target.value)} style={s.input}>
              <option value="">Todos os clientes</option>
              {clientes.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div style={s.campo}>
            <label style={s.label}>Data início</label>
            <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} style={s.input} />
          </div>
          <div style={s.campo}>
            <label style={s.label}>Data fim</label>
            <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} style={s.input} />
          </div>
          <div style={s.campo}>
            <label style={s.label}>Chave NF-e</label>
            <input type="text" value={chaveNfe} onChange={(e) => setChaveNfe(e.target.value)} placeholder="Busca parcial" style={s.input} />
          </div>
        </div>
        <div style={s.filtrosBotoes}>
          <button type="submit" style={s.btnPrimario}>Filtrar</button>
          <button type="button" onClick={handleLimpar} style={s.btnSecundario}>Limpar</button>
        </div>
      </form>

      {erro && <p style={s.erro}>{erro}</p>}

      {carregando ? (
        <div style={s.loadingWrap}><span style={s.spinner} /><span style={{ color: colors.textSecondary, fontFamily: fonts.body }}>Carregando…</span></div>
      ) : entregas.length === 0 ? (
        <div style={s.vazio}><span style={{ fontSize: '2rem' }}>📦</span><p style={{ color: colors.textSecondary, fontFamily: fonts.body }}>Nenhuma entrega encontrada.</p></div>
      ) : (
        <>
          <div style={s.tabelaWrapper}>
            <table style={s.tabela}>
              <thead>
                <tr>
                  {['Data/Hora', 'Entregador', 'Cliente', 'Chave NF-e', 'Status', 'DANFE', 'Ações'].map((h) => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entregas.map((e) => {
                  const clienteNome = e.dados_nfe?.dest_nome ?? e.dados_nfe?.emit_nome ?? '—';
                  return (
                    <tr key={e.id} style={s.tr}>
                      <td style={s.td}>{new Date(e.data_hora).toLocaleString('pt-BR')}</td>
                      <td style={s.td}>{e.entregador_nome}</td>
                      <td style={{ ...s.td, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }} title={clienteNome}>{clienteNome}</td>
                      <td style={{ ...s.td, fontFamily: 'monospace', fontSize: '12px', color: colors.textSecondary }}>{e.chave_nfe}</td>
                      <td style={s.td}><span style={{ ...s.badge, ...badgeStyle(e.status) }}>{e.status}</span></td>
                      <td style={s.td}><span title={e.danfe_pdf_base64 ? 'DANFE disponível' : 'DANFE pendente'}>{e.danfe_pdf_base64 ? '✅' : '⏳'}</span></td>
                      <td style={s.td}>
                        <button onClick={() => router.push(`/admin/entregas/${e.id}`)} style={s.btnLink}>Ver →</button>
                        <button onClick={() => handleExcluir(e.id)} disabled={excluindo === e.id}
                          style={{ ...s.btnLink, color: colors.error, marginLeft: '0.75rem', opacity: excluindo === e.id ? 0.5 : 1 }}>
                          {excluindo === e.id ? '…' : 'Excluir'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPaginas > 1 && (
            <div style={s.paginacao}>
              <button onClick={() => handlePagina(page - 1)} disabled={page === 1} style={page === 1 ? s.btnPagDisabled : s.btnPag}>← Anterior</button>
              <span style={{ fontSize: '0.875rem', color: colors.textSecondary, fontFamily: fonts.body }}>Página {page} de {totalPaginas} ({total} registros)</span>
              <button onClick={() => handlePagina(page + 1)} disabled={page === totalPaginas} style={page === totalPaginas ? s.btnPagDisabled : s.btnPag}>Próxima →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function badgeStyle(status: string): React.CSSProperties {
  if (status === 'ENVIADO') return { backgroundColor: colors.successBg, color: colors.success, border: `1px solid ${colors.successBorder}` };
  if (status === 'ERRO') return { backgroundColor: colors.errorBg, color: colors.error, border: `1px solid ${colors.errorBorder}` };
  return { backgroundColor: colors.warningBg, color: colors.warning, border: `1px solid ${colors.warningBorder}` };
}

const s: Record<string, React.CSSProperties> = {
  titulo: { fontSize: '1.5rem', fontWeight: 700, color: colors.textPrimary, marginBottom: '1.25rem', fontFamily: fonts.title },
  card: { backgroundColor: colors.bgCard, borderRadius: radius.lg, padding: '1.25rem', marginBottom: '1.25rem', border: `1px solid ${colors.border}` },
  filtrosGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' },
  campo: { display: 'flex', flexDirection: 'column', gap: '4px' },
  label: { fontSize: '0.75rem', fontWeight: 500, color: colors.textSecondary, fontFamily: fonts.body, textTransform: 'uppercase', letterSpacing: '0.04em' },
  input: { padding: '0.5rem 0.75rem', border: `1px solid ${colors.border}`, borderRadius: radius.sm, fontSize: '0.875rem', outline: 'none', backgroundColor: colors.bgSecondary, color: colors.textPrimary, fontFamily: fonts.body },
  filtrosBotoes: { display: 'flex', gap: '0.5rem' },
  btnPrimario: { padding: '0.5rem 1.25rem', backgroundColor: colors.accent, color: '#fff', border: 'none', borderRadius: radius.md, fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', fontFamily: fonts.title },
  btnSecundario: { padding: '0.5rem 1.25rem', backgroundColor: 'transparent', color: colors.textSecondary, border: `1px solid ${colors.border}`, borderRadius: radius.md, fontSize: '0.875rem', cursor: 'pointer', fontFamily: fonts.body },
  erro: { color: colors.error, fontSize: '0.875rem', marginBottom: '1rem', fontFamily: fonts.body },
  loadingWrap: { display: 'flex', alignItems: 'center', gap: '10px', padding: '2rem' },
  spinner: { display: 'inline-block', width: '18px', height: '18px', border: `2px solid ${colors.border}`, borderTopColor: colors.accent, borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  vazio: { backgroundColor: colors.bgCard, border: `1px dashed ${colors.border}`, borderRadius: radius.lg, padding: '3rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' },
  tabelaWrapper: { overflowX: 'auto', borderRadius: radius.lg, border: `1px solid ${colors.border}` },
  tabela: { width: '100%', borderCollapse: 'collapse', backgroundColor: colors.bgCard },
  th: { padding: '0.875rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: `1px solid ${colors.border}`, backgroundColor: colors.bgSecondary, fontFamily: fonts.body },
  td: { padding: '0.875rem 1rem', fontSize: '0.875rem', color: colors.textPrimary, borderBottom: `1px solid ${colors.border}`, fontFamily: fonts.body },
  tr: {},
  badge: { display: 'inline-block', padding: '3px 10px', borderRadius: '9999px', fontSize: '0.7rem', fontWeight: 600, fontFamily: fonts.body },
  btnLink: { background: 'none', border: 'none', color: colors.accent, fontSize: '0.875rem', cursor: 'pointer', padding: 0, fontFamily: fonts.body, fontWeight: 500 },
  paginacao: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginTop: '1.25rem' },
  btnPag: { padding: '0.375rem 0.875rem', border: `1px solid ${colors.border}`, borderRadius: radius.md, backgroundColor: colors.bgCard, color: colors.textSecondary, fontSize: '0.875rem', cursor: 'pointer', fontFamily: fonts.body },
  btnPagDisabled: { padding: '0.375rem 0.875rem', border: `1px solid ${colors.border}`, borderRadius: radius.md, backgroundColor: 'transparent', color: colors.textMuted, fontSize: '0.875rem', cursor: 'not-allowed', fontFamily: fonts.body },
};
