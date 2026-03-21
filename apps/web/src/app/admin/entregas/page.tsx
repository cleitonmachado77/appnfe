'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  getToken,
  listarEntregas,
  listarUsuarios,
  type EntregaResponse,
  type UsuarioResponse,
  type FiltrosEntrega,
} from '@/lib/api';

export default function EntregasPage() {
  const router = useRouter();

  const [entregas, setEntregas] = useState<EntregaResponse[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  // Filtros
  const [entregadorId, setEntregadorId] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [chaveNfe, setChaveNfe] = useState('');
  const [page, setPage] = useState(1);
  const LIMIT = 20;

  const buscar = useCallback(
    async (filtros: FiltrosEntrega) => {
      const token = getToken();
      if (!token) { router.replace('/login'); return; }
      setCarregando(true);
      setErro('');
      try {
        const res = await listarEntregas(filtros, token);
        setEntregas(res.data);
        setTotal(res.total);
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'Erro ao carregar entregas');
      } finally {
        setCarregando(false);
      }
    },
    [router],
  );

  // Carrega usuários para o select de filtro
  useEffect(() => {
    const token = getToken();
    if (!token) return;
    listarUsuarios(token)
      .then(setUsuarios)
      .catch(() => {});
  }, []);

  // Busca inicial
  useEffect(() => {
    buscar({ page: 1, limit: LIMIT });
  }, [buscar]);

  function handleFiltrar(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    buscar({
      entregador_id: entregadorId || undefined,
      data_inicio: dataInicio || undefined,
      data_fim: dataFim || undefined,
      chave_nfe: chaveNfe || undefined,
      page: 1,
      limit: LIMIT,
    });
  }

  function handleLimpar() {
    setEntregadorId('');
    setDataInicio('');
    setDataFim('');
    setChaveNfe('');
    setPage(1);
    buscar({ page: 1, limit: LIMIT });
  }

  function handlePagina(nova: number) {
    setPage(nova);
    buscar({
      entregador_id: entregadorId || undefined,
      data_inicio: dataInicio || undefined,
      data_fim: dataFim || undefined,
      chave_nfe: chaveNfe || undefined,
      page: nova,
      limit: LIMIT,
    });
  }

  const totalPaginas = Math.ceil(total / LIMIT);

  return (
    <div>
      <h1 style={s.titulo}>Entregas</h1>

      {/* Filtros */}
      <form onSubmit={handleFiltrar} style={s.filtrosCard}>
        <div style={s.filtrosGrid}>
          <div style={s.campo}>
            <label style={s.label}>Entregador</label>
            <select
              value={entregadorId}
              onChange={(e) => setEntregadorId(e.target.value)}
              style={s.input}
            >
              <option value="">Todos</option>
              {usuarios.map((u) => (
                <option key={u.id} value={u.id}>{u.nome}</option>
              ))}
            </select>
          </div>

          <div style={s.campo}>
            <label style={s.label}>Data início</label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              style={s.input}
            />
          </div>

          <div style={s.campo}>
            <label style={s.label}>Data fim</label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              style={s.input}
            />
          </div>

          <div style={s.campo}>
            <label style={s.label}>Chave NF-e</label>
            <input
              type="text"
              value={chaveNfe}
              onChange={(e) => setChaveNfe(e.target.value)}
              placeholder="Busca parcial"
              style={s.input}
            />
          </div>
        </div>

        <div style={s.filtrosBotoes}>
          <button type="submit" style={s.btnPrimario}>Filtrar</button>
          <button type="button" onClick={handleLimpar} style={s.btnSecundario}>Limpar</button>
        </div>
      </form>

      {/* Erro */}
      {erro && <p style={s.erro}>{erro}</p>}

      {/* Tabela */}
      {carregando ? (
        <p style={s.info}>Carregando…</p>
      ) : entregas.length === 0 ? (
        <div style={s.vazio}>
          <p>Nenhuma entrega encontrada para os filtros aplicados.</p>
        </div>
      ) : (
        <>
          <div style={s.tabelaWrapper}>
            <table style={s.tabela}>
              <thead>
                <tr>
                  <th style={s.th}>Data/Hora</th>
                  <th style={s.th}>Entregador</th>
                  <th style={s.th}>Chave NF-e</th>
                  <th style={s.th}>Status</th>
                  <th style={s.th}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {entregas.map((e) => (
                  <tr key={e.id} style={s.tr}>
                    <td style={s.td}>{new Date(e.data_hora).toLocaleString('pt-BR')}</td>
                    <td style={s.td}>{e.entregador_nome}</td>
                    <td style={{ ...s.td, fontFamily: 'monospace', fontSize: '12px' }}>
                      {e.chave_nfe}
                    </td>
                    <td style={s.td}>
                      <span style={{ ...s.badge, ...badgeColor(e.status) }}>{e.status}</span>
                    </td>
                    <td style={s.td}>
                      <button
                        onClick={() => router.push(`/admin/entregas/${e.id}`)}
                        style={s.btnLink}
                      >
                        Ver detalhes
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {totalPaginas > 1 && (
            <div style={s.paginacao}>
              <button
                onClick={() => handlePagina(page - 1)}
                disabled={page === 1}
                style={page === 1 ? s.btnPagDisabled : s.btnPag}
              >
                ← Anterior
              </button>
              <span style={s.paginacaoInfo}>
                Página {page} de {totalPaginas} ({total} registros)
              </span>
              <button
                onClick={() => handlePagina(page + 1)}
                disabled={page === totalPaginas}
                style={page === totalPaginas ? s.btnPagDisabled : s.btnPag}
              >
                Próxima →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function badgeColor(status: string): React.CSSProperties {
  if (status === 'ENVIADO') return { backgroundColor: '#dcfce7', color: '#15803d' };
  if (status === 'ERRO') return { backgroundColor: '#fef2f2', color: '#b91c1c' };
  return { backgroundColor: '#fef9c3', color: '#854d0e' };
}

const s: Record<string, React.CSSProperties> = {
  titulo: { fontSize: '1.5rem', fontWeight: 700, color: '#111827', marginBottom: '1.25rem' },
  filtrosCard: {
    backgroundColor: '#fff',
    borderRadius: '0.5rem',
    padding: '1rem',
    marginBottom: '1.25rem',
    border: '1px solid #e5e7eb',
  },
  filtrosGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '0.75rem',
    marginBottom: '0.75rem',
  },
  campo: { display: 'flex', flexDirection: 'column', gap: '4px' },
  label: { fontSize: '0.8rem', fontWeight: 500, color: '#374151' },
  input: {
    padding: '0.5rem 0.625rem',
    border: '1px solid #d1d5db',
    borderRadius: '0.375rem',
    fontSize: '0.875rem',
    outline: 'none',
  },
  filtrosBotoes: { display: 'flex', gap: '0.5rem' },
  btnPrimario: {
    padding: '0.5rem 1rem',
    backgroundColor: '#1a56db',
    color: '#fff',
    border: 'none',
    borderRadius: '0.375rem',
    fontSize: '0.875rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  btnSecundario: {
    padding: '0.5rem 1rem',
    backgroundColor: '#fff',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: '0.375rem',
    fontSize: '0.875rem',
    cursor: 'pointer',
  },
  erro: { color: '#dc2626', fontSize: '0.875rem', marginBottom: '1rem' },
  info: { color: '#6b7280', fontSize: '0.875rem' },
  vazio: {
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '0.5rem',
    padding: '2rem',
    textAlign: 'center',
    color: '#6b7280',
  },
  tabelaWrapper: { overflowX: 'auto', borderRadius: '0.5rem', border: '1px solid #e5e7eb' },
  tabela: { width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff' },
  th: {
    padding: '0.75rem 1rem',
    textAlign: 'left',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb',
  },
  td: {
    padding: '0.75rem 1rem',
    fontSize: '0.875rem',
    color: '#111827',
    borderBottom: '1px solid #f3f4f6',
  },
  tr: {},
  badge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '9999px',
    fontSize: '0.75rem',
    fontWeight: 600,
  },
  btnLink: {
    background: 'none',
    border: 'none',
    color: '#1a56db',
    fontSize: '0.875rem',
    cursor: 'pointer',
    padding: 0,
    textDecoration: 'underline',
  },
  paginacao: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1rem',
    marginTop: '1rem',
  },
  paginacaoInfo: { fontSize: '0.875rem', color: '#6b7280' },
  btnPag: {
    padding: '0.375rem 0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '0.375rem',
    backgroundColor: '#fff',
    fontSize: '0.875rem',
    cursor: 'pointer',
  },
  btnPagDisabled: {
    padding: '0.375rem 0.75rem',
    border: '1px solid #e5e7eb',
    borderRadius: '0.375rem',
    backgroundColor: '#f9fafb',
    fontSize: '0.875rem',
    color: '#9ca3af',
    cursor: 'not-allowed',
  },
};
