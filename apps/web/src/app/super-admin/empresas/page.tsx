'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getToken, listarEmpresas, atualizarStatusEmpresa, type EmpresaResponse } from '@/lib/api';
import { colors, fonts, radius } from '@/lib/brand';

const STATUS_COLOR: Record<string, { bg: string; color: string; border: string }> = {
  ATIVA: { bg: colors.successBg, color: colors.success, border: colors.successBorder },
  INATIVA: { bg: 'rgba(158,158,158,0.1)', color: '#9E9E9E', border: 'rgba(158,158,158,0.3)' },
  SUSPENSA: { bg: colors.errorBg, color: colors.error, border: colors.errorBorder },
};

export default function EmpresasPage() {
  const router = useRouter();
  const [empresas, setEmpresas] = useState<EmpresaResponse[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');

  useEffect(() => {
    const token = getToken();
    if (!token) { router.replace('/login'); return; }
    listarEmpresas(token).then(setEmpresas).finally(() => setCarregando(false));
  }, [router]);

  async function handleStatus(id: string, status: string) {
    const token = getToken()!;
    const atualizada = await atualizarStatusEmpresa(id, status, token);
    setEmpresas((prev) => prev.map((e) => e.id === id ? { ...e, status: atualizada.status } : e));
  }

  const filtradas = empresas.filter((e) =>
    e.razao_social.toLowerCase().includes(busca.toLowerCase()) ||
    e.cnpj.includes(busca) ||
    (e.nome_fantasia ?? '').toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h1 style={s.titulo}>Empresas</h1>
        <Link href="/super-admin/cadastrar" style={s.btnNovo}>+ Nova Empresa</Link>
      </div>

      <input
        type="text" placeholder="Buscar por razão social, fantasia ou CNPJ…"
        value={busca} onChange={(e) => setBusca(e.target.value)}
        style={s.busca}
      />

      {carregando ? (
        <p style={{ color: colors.textSecondary, fontFamily: fonts.body }}>Carregando…</p>
      ) : filtradas.length === 0 ? (
        <p style={{ color: colors.textMuted, fontFamily: fonts.body }}>Nenhuma empresa encontrada.</p>
      ) : (
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>
                {['Empresa', 'CNPJ', 'Responsável', 'Plano', 'Entregas', 'Status', 'Ações'].map((h) => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtradas.map((e) => {
                const sc = STATUS_COLOR[e.status];
                return (
                  <tr key={e.id} style={s.tr}>
                    <td style={s.td}>
                      <p style={{ margin: 0, fontWeight: 600, color: colors.textPrimary, fontFamily: fonts.body, fontSize: '0.875rem' }}>{e.razao_social}</p>
                      {e.nome_fantasia && <p style={{ margin: 0, fontSize: '0.75rem', color: colors.textMuted, fontFamily: fonts.body }}>{e.nome_fantasia}</p>}
                    </td>
                    <td style={{ ...s.td, fontFamily: 'monospace', fontSize: '0.8rem', color: colors.textSecondary }}>{e.cnpj}</td>
                    <td style={s.td}>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: colors.textPrimary, fontFamily: fonts.body }}>{e.responsavel_nome}</p>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: colors.textMuted, fontFamily: fonts.body }}>{e.responsavel_email}</p>
                    </td>
                    <td style={{ ...s.td, color: colors.textSecondary, fontSize: '0.8rem', fontFamily: fonts.body }}>{e.plano ?? '—'}</td>
                    <td style={{ ...s.td, color: colors.textSecondary, fontSize: '0.8rem', fontFamily: fonts.body, textAlign: 'center' }}>{e.totalEntregas ?? 0}</td>
                    <td style={s.td}>
                      <span style={{ ...s.badge, backgroundColor: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>{e.status}</span>
                    </td>
                    <td style={s.td}>
                      <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                        {e.status !== 'ATIVA' && <button onClick={() => handleStatus(e.id, 'ATIVA')} style={{ ...s.btnAcao, color: colors.success }}>Ativar</button>}
                        {e.status !== 'SUSPENSA' && <button onClick={() => handleStatus(e.id, 'SUSPENSA')} style={{ ...s.btnAcao, color: colors.warning }}>Suspender</button>}
                        {e.status !== 'INATIVA' && <button onClick={() => handleStatus(e.id, 'INATIVA')} style={{ ...s.btnAcao, color: colors.error }}>Inativar</button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  titulo: { fontSize: '1.5rem', fontWeight: 700, color: colors.textPrimary, margin: 0, fontFamily: fonts.title },
  btnNovo: { backgroundColor: '#FFA726', color: '#1C1C1C', border: 'none', borderRadius: radius.md, padding: '0.5rem 1.25rem', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer', fontFamily: fonts.title, textDecoration: 'none' },
  busca: { padding: '0.5rem 0.875rem', border: `1px solid ${colors.border}`, borderRadius: radius.md, backgroundColor: colors.bgCard, color: colors.textPrimary, fontFamily: fonts.body, fontSize: '0.875rem', outline: 'none', width: '100%', boxSizing: 'border-box' as const },
  tableWrap: { overflowX: 'auto' as const, borderRadius: radius.lg, border: `1px solid ${colors.border}` },
  table: { width: '100%', borderCollapse: 'collapse' as const },
  th: { padding: '0.75rem 1rem', textAlign: 'left' as const, fontSize: '0.7rem', fontWeight: 600, color: colors.textMuted, fontFamily: fonts.body, textTransform: 'uppercase' as const, letterSpacing: '0.05em', borderBottom: `1px solid ${colors.border}`, backgroundColor: colors.bgSecondary },
  tr: { borderBottom: `1px solid ${colors.border}` },
  td: { padding: '0.875rem 1rem', verticalAlign: 'middle' as const },
  badge: { display: 'inline-block', padding: '2px 10px', borderRadius: radius.full, fontSize: '0.7rem', fontWeight: 600, fontFamily: fonts.body, letterSpacing: '0.05em' },
  btnAcao: { background: 'transparent', border: `1px solid currentColor`, borderRadius: radius.sm, padding: '3px 10px', fontSize: '0.75rem', cursor: 'pointer', fontFamily: fonts.body },
};
