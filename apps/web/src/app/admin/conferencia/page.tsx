'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getToken, getCruzamentoNfe, type CruzamentoResponse, type NfeEmitidaResponse } from '@/lib/api';
import { colors, fonts, radius } from '@/lib/brand';

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export default function ConferenciaPage() {
  const router = useRouter();
  const [dados, setDados] = useState<CruzamentoResponse | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    const token = getToken();
    if (!token) { router.replace('/login'); return; }
    getCruzamentoNfe(token)
      .then(setDados)
      .catch((e) => setErro(e instanceof Error ? e.message : 'Erro ao carregar'))
      .finally(() => setCarregando(false));
  }, [router]);

  if (carregando) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '2rem' }}>
      <span style={s.spinner} />
      <span style={{ color: colors.textSecondary, fontFamily: fonts.body }}>Carregando…</span>
    </div>
  );

  if (erro) return <p style={{ color: colors.error, fontFamily: fonts.body }}>{erro}</p>;
  if (!dados) return null;

  const total = dados.total_com_entrega + dados.total_sem_entrega;
  const pct = total > 0 ? Math.round((dados.total_com_entrega / total) * 100) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 style={s.titulo}>Conferência</h1>
        <p style={s.subtitulo}>Cruzamento entre NF-e emitidas e entregas registradas</p>
      </div>

      {/* KPIs */}
      <div style={s.kpiGrid}>
        <KpiCard
          label="NF-e com entrega"
          value={dados.total_com_entrega.toLocaleString('pt-BR')}
          icon="✅"
          cor={colors.success}
        />
        <KpiCard
          label="NF-e sem entrega"
          value={dados.total_sem_entrega.toLocaleString('pt-BR')}
          icon="⚠️"
          cor={colors.warning}
        />
        <KpiCard
          label="Total de NF-e"
          value={total.toLocaleString('pt-BR')}
          icon="📄"
          cor={colors.accent}
        />
        <div style={s.kpiCard}>
          <span style={{ fontSize: '1.5rem' }}>📊</span>
          <div style={{ flex: 1 }}>
            <p style={s.kpiLabel}>Cobertura de entregas</p>
            <p style={{ ...s.kpiValue, color: pct >= 80 ? colors.success : pct >= 50 ? colors.warning : colors.error }}>
              {pct}%
            </p>
            <div style={s.progressBg}>
              <div style={{
                ...s.progressFill,
                width: `${pct}%`,
                backgroundColor: pct >= 80 ? colors.success : pct >= 50 ? colors.warning : colors.error,
              }} />
            </div>
          </div>
        </div>
      </div>

      {/* NF-e sem entrega */}
      {dados.sem_entrega.length > 0 ? (
        <div style={s.card}>
          <p style={s.secaoTitulo}>⚠️ NF-e emitidas sem entrega registrada ({dados.total_sem_entrega})</p>
          <div style={s.tabelaWrapper}>
            <table style={s.tabela}>
              <thead>
                <tr>
                  {['Nº / Série', 'Destinatário', 'CNPJ/CPF', 'Valor', 'Emissão'].map((h) => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dados.sem_entrega.map((nfe: NfeEmitidaResponse) => (
                  <tr key={nfe.id} style={s.tr}>
                    <td style={{ ...s.td, fontFamily: 'monospace', fontSize: '0.8rem' }}>
                      {nfe.numero_nfe ?? '—'}{nfe.serie ? `/${nfe.serie}` : ''}
                    </td>
                    <td style={{ ...s.td, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                      {nfe.dest_nome ?? '—'}
                    </td>
                    <td style={{ ...s.td, fontFamily: 'monospace', fontSize: '0.8rem' }}>
                      {nfe.dest_cnpj_cpf ?? '—'}
                    </td>
                    <td style={{ ...s.td, fontWeight: 600 }}>
                      {nfe.valor_total != null ? fmt(Number(nfe.valor_total)) : '—'}
                    </td>
                    <td style={s.td}>
                      {nfe.data_emissao ? new Date(nfe.data_emissao).toLocaleDateString('pt-BR') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div style={s.vazio}>
          <span style={{ fontSize: '2.5rem' }}>✅</span>
          <p style={{ color: colors.textSecondary, fontFamily: fonts.body, margin: 0 }}>
            Todas as NF-e emitidas possuem entrega registrada.
          </p>
        </div>
      )}
    </div>
  );
}

function KpiCard({ label, value, icon, cor }: { label: string; value: string; icon: string; cor: string }) {
  return (
    <div style={s.kpiCard}>
      <span style={{ fontSize: '1.5rem' }}>{icon}</span>
      <div>
        <p style={s.kpiLabel}>{label}</p>
        <p style={{ ...s.kpiValue, color: cor }}>{value}</p>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  titulo: { fontSize: '1.5rem', fontWeight: 700, color: colors.textPrimary, margin: '0 0 0.25rem', fontFamily: fonts.title },
  subtitulo: { fontSize: '0.875rem', color: colors.textSecondary, margin: 0, fontFamily: fonts.body },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' },
  kpiCard: { backgroundColor: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.875rem' },
  kpiLabel: { margin: 0, fontSize: '0.7rem', color: colors.textMuted, fontFamily: fonts.body, textTransform: 'uppercase', letterSpacing: '0.06em' },
  kpiValue: { margin: '0.2rem 0 0', fontSize: '1.3rem', fontWeight: 700, fontFamily: fonts.title },
  progressBg: { marginTop: '0.4rem', height: 4, backgroundColor: colors.border, borderRadius: 9999, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 9999, transition: 'width 0.4s ease' },
  card: { backgroundColor: colors.bgCard, borderRadius: radius.lg, padding: '1.25rem', border: `1px solid ${colors.border}` },
  secaoTitulo: { margin: '0 0 0.75rem', fontSize: '0.75rem', fontWeight: 700, color: colors.textSecondary, fontFamily: fonts.title, textTransform: 'uppercase', letterSpacing: '0.07em' },
  tabelaWrapper: { overflowX: 'auto', borderRadius: radius.lg, border: `1px solid ${colors.border}` },
  tabela: { width: '100%', borderCollapse: 'collapse', backgroundColor: colors.bgCard },
  th: { padding: '0.875rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: `1px solid ${colors.border}`, backgroundColor: colors.bgSecondary, fontFamily: fonts.body },
  td: { padding: '0.875rem 1rem', fontSize: '0.875rem', color: colors.textPrimary, borderBottom: `1px solid ${colors.border}`, fontFamily: fonts.body },
  tr: {},
  vazio: { backgroundColor: colors.bgCard, border: `1px dashed ${colors.border}`, borderRadius: radius.lg, padding: '3rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' },
  spinner: { display: 'inline-block', width: 18, height: 18, border: `2px solid ${colors.border}`, borderTopColor: colors.accent, borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
};
