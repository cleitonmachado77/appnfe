'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getToken, listarLogs, getAuditExportUrl, type AuditLogEntry } from '@/lib/api';
import { colors, fonts, radius } from '@/lib/brand';

const ACAO_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  LOGIN:                  { label: 'Login',              color: colors.info,    bg: colors.infoBg },
  CRIAR_ENTREGA:          { label: 'Nova Entrega',        color: colors.success, bg: colors.successBg },
  EXCLUIR_ENTREGA:        { label: 'Excluiu Entrega',     color: colors.error,   bg: colors.errorBg },
  CRIAR_ENTREGADOR:       { label: 'Novo Entregador',     color: colors.success, bg: colors.successBg },
  EXCLUIR_ENTREGADOR:     { label: 'Excluiu Entregador',  color: colors.error,   bg: colors.errorBg },
  CRIAR_EMPRESA:          { label: 'Nova Empresa',        color: colors.warning, bg: colors.warningBg },
  ALTERAR_STATUS_EMPRESA: { label: 'Status Empresa',      color: colors.warning, bg: colors.warningBg },
};

const LIMIT = 50;

export default function LogsPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [busca, setBusca] = useState('');

  const carregar = useCallback(async (p: number) => {
    const token = getToken();
    if (!token) { router.replace('/login'); return; }
    setCarregando(true); setErro('');
    try {
      const res = await listarLogs(token, p, LIMIT);
      setLogs(res.data); setTotal(res.total);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro');
    } finally { setCarregando(false); }
  }, [router]);

  useEffect(() => { carregar(1); }, [carregar]);

  function handlePagina(nova: number) { setPage(nova); carregar(nova); }

  async function handleExportar() {
    const token = getToken();
    if (!token) return;
    const url = getAuditExportUrl();
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  const totalPaginas = Math.ceil(total / LIMIT);
  const logsFiltrados = busca
    ? logs.filter((l) =>
        [l.acao, l.usuario_nome, l.usuario_email, l.recurso, l.rota]
          .some((v) => v?.toLowerCase().includes(busca.toLowerCase()))
      )
    : logs;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={s.titulo}>Logs de Auditoria</h1>
          <p style={s.subtitulo}>{total} eventos registrados</p>
        </div>
        <button onClick={handleExportar} style={s.btnExportar}>⬇ Exportar CSV</button>
      </div>

      <input
        type="text" placeholder="Buscar por ação, operador, rota…"
        value={busca} onChange={(e) => setBusca(e.target.value)}
        style={s.busca}
      />

      {erro && <p style={{ color: colors.error, fontFamily: fonts.body, fontSize: '0.875rem' }}>{erro}</p>}

      {carregando ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '2rem' }}>
          <span style={s.spinner} />
          <span style={{ color: colors.textSecondary, fontFamily: fonts.body }}>Carregando…</span>
        </div>
      ) : logsFiltrados.length === 0 ? (
        <div style={s.vazio}>
          <span style={{ fontSize: '2rem' }}>📋</span>
          <p style={{ color: colors.textSecondary, fontFamily: fonts.body }}>Nenhum evento registrado ainda.</p>
        </div>
      ) : (
        <>
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead>
                <tr>
                  {['Data/Hora', 'Ação', 'Operador', 'Recurso', 'Rota', 'Status'].map((h) => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logsFiltrados.map((l) => {
                  const meta = ACAO_LABEL[l.acao];
                  return (
                    <tr key={l.id}>
                      <td style={{ ...s.td, whiteSpace: 'nowrap' as const, color: colors.textMuted, fontSize: '0.8rem', fontFamily: 'monospace' }}>
                        {new Date(l.criado_em).toLocaleString('pt-BR')}
                      </td>
                      <td style={s.td}>
                        <span style={{
                          display: 'inline-block', padding: '2px 10px', borderRadius: radius.full,
                          fontSize: '0.7rem', fontWeight: 600, fontFamily: fonts.body,
                          backgroundColor: meta?.bg ?? colors.bgSecondary,
                          color: meta?.color ?? colors.textSecondary,
                        }}>
                          {meta?.label ?? l.acao}
                        </span>
                      </td>
                      <td style={s.td}>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: colors.textPrimary, fontFamily: fonts.body }}>{l.usuario_nome ?? '—'}</p>
                        <p style={{ margin: 0, fontSize: '0.72rem', color: colors.textMuted, fontFamily: fonts.body }}>{l.usuario_email ?? ''}</p>
                      </td>
                      <td style={{ ...s.td, fontSize: '0.8rem', color: colors.textSecondary, fontFamily: fonts.body }}>
                        {l.recurso ?? '—'}
                        {l.recurso_id && <p style={{ margin: 0, fontSize: '0.68rem', color: colors.textMuted, fontFamily: 'monospace' }}>{l.recurso_id}</p>}
                      </td>
                      <td style={{ ...s.td, fontSize: '0.75rem', color: colors.textMuted, fontFamily: 'monospace', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                        {l.rota ?? '—'}
                      </td>
                      <td style={s.td}>
                        <span style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: (l.status_http ?? 0) >= 400 ? colors.error : colors.success }}>
                          {l.status_http ?? '—'}
                        </span>
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
              <span style={{ fontSize: '0.875rem', color: colors.textSecondary, fontFamily: fonts.body }}>
                Página {page} de {totalPaginas}
              </span>
              <button onClick={() => handlePagina(page + 1)} disabled={page === totalPaginas} style={page === totalPaginas ? s.btnPagDisabled : s.btnPag}>Próxima →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  titulo: { fontSize: '1.5rem', fontWeight: 700, color: colors.textPrimary, margin: 0, fontFamily: fonts.title },
  subtitulo: { margin: '0.25rem 0 0', fontSize: '0.8rem', color: colors.textMuted, fontFamily: fonts.body },
  btnExportar: { backgroundColor: colors.bgCard, border: `1px solid ${colors.border}`, color: colors.textPrimary, borderRadius: radius.md, padding: '0.5rem 1.25rem', fontSize: '0.875rem', cursor: 'pointer', fontFamily: fonts.body, fontWeight: 500 },
  busca: { padding: '0.5rem 0.875rem', border: `1px solid ${colors.border}`, borderRadius: radius.md, backgroundColor: colors.bgCard, color: colors.textPrimary, fontFamily: fonts.body, fontSize: '0.875rem', outline: 'none', width: '100%', boxSizing: 'border-box' as const },
  vazio: { backgroundColor: colors.bgCard, border: `1px dashed ${colors.border}`, borderRadius: radius.lg, padding: '3rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' },
  tableWrap: { overflowX: 'auto' as const, borderRadius: radius.lg, border: `1px solid ${colors.border}` },
  table: { width: '100%', borderCollapse: 'collapse' as const, backgroundColor: colors.bgCard },
  th: { padding: '0.75rem 1rem', textAlign: 'left' as const, fontSize: '0.7rem', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase' as const, letterSpacing: '0.05em', borderBottom: `1px solid ${colors.border}`, backgroundColor: colors.bgSecondary, fontFamily: fonts.body },
  td: { padding: '0.75rem 1rem', borderBottom: `1px solid ${colors.border}`, verticalAlign: 'middle' as const },
  spinner: { display: 'inline-block', width: 18, height: 18, border: `2px solid ${colors.border}`, borderTopColor: colors.accent, borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  paginacao: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginTop: '0.5rem' },
  btnPag: { padding: '0.375rem 0.875rem', border: `1px solid ${colors.border}`, borderRadius: radius.md, backgroundColor: colors.bgCard, color: colors.textSecondary, fontSize: '0.875rem', cursor: 'pointer', fontFamily: fonts.body },
  btnPagDisabled: { padding: '0.375rem 0.875rem', border: `1px solid ${colors.border}`, borderRadius: radius.md, backgroundColor: 'transparent', color: colors.textMuted, fontSize: '0.875rem', cursor: 'not-allowed', fontFamily: fonts.body },
};
