'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { getToken, getStatsGlobais, type StatsGlobais } from '@/lib/api';
import { colors, fonts, radius } from '@/lib/brand';

const STATUS_COLORS: Record<string, string> = { ATIVA: '#4CAF50', INATIVA: '#9E9E9E', SUSPENSA: '#EF5350' };
const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
const fmtK = (v: number) => v >= 1000000 ? `R$ ${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `R$ ${(v / 1000).toFixed(1)}k` : fmt(v);

export default function SuperDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<StatsGlobais | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) { router.replace('/login'); return; }
    getStatsGlobais(token)
      .then(setStats)
      .catch(() => router.replace('/login'))
      .finally(() => setCarregando(false));
  }, [router]);

  if (carregando) return <p style={{ color: colors.textSecondary, fontFamily: fonts.body }}>Carregando…</p>;
  if (!stats) return null;

  const kpis = [
    { label: 'Empresas Cadastradas', value: stats.totalEmpresas.toLocaleString('pt-BR'), icon: '🏢' },
    { label: 'Admins Ativos', value: stats.totalAdmins.toLocaleString('pt-BR'), icon: '👤' },
    { label: 'Total de Entregas', value: stats.totalEntregas.toLocaleString('pt-BR'), icon: '📦' },
    { label: 'Valor Movimentado', value: fmtK(stats.valorMovimentado), icon: '💰' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <h1 style={s.titulo}>Visão Geral da Plataforma</h1>

      <div style={s.kpiGrid}>
        {kpis.map((k) => (
          <div key={k.label} style={s.kpiCard}>
            <span style={{ fontSize: '1.5rem' }}>{k.icon}</span>
            <div>
              <p style={s.kpiLabel}>{k.label}</p>
              <p style={s.kpiValue}>{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div style={s.row2}>
        <div style={{ ...s.card, flex: 2 }}>
          <p style={s.cardTitle}>Entregas por Mês</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats.entregasPorMes}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
              <XAxis dataKey="mes" tick={tick} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={tick} />
              <Tooltip contentStyle={tooltip} />
              <Bar dataKey="count" fill="#FFA726" name="Entregas" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ ...s.card, flex: 1 }}>
          <p style={s.cardTitle}>Empresas por Status</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={stats.empresasPorStatus} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={80}
                label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                {stats.empresasPorStatus.map((e, i) => (
                  <Cell key={i} fill={STATUS_COLORS[e.status] ?? '#9E9E9E'} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltip} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

const tick = { fill: colors.textMuted, fontSize: 11, fontFamily: fonts.body };
const tooltip = { backgroundColor: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: radius.md, color: colors.textPrimary, fontFamily: fonts.body, fontSize: '0.8rem' };

const s: Record<string, React.CSSProperties> = {
  titulo: { fontSize: '1.5rem', fontWeight: 700, color: colors.textPrimary, margin: '0 0 0.25rem', fontFamily: fonts.title },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' },
  kpiCard: { backgroundColor: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.875rem' },
  kpiLabel: { margin: 0, fontSize: '0.7rem', color: colors.textMuted, fontFamily: fonts.body, textTransform: 'uppercase', letterSpacing: '0.06em' },
  kpiValue: { margin: '0.2rem 0 0', fontSize: '1.3rem', fontWeight: 700, color: colors.textPrimary, fontFamily: fonts.title },
  row2: { display: 'flex', gap: '0.75rem', flexWrap: 'wrap' as const },
  card: { backgroundColor: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: '1.25rem', minWidth: 0 },
  cardTitle: { margin: '0 0 1rem', fontSize: '0.8rem', fontWeight: 600, color: colors.textSecondary, fontFamily: fonts.title, textTransform: 'uppercase', letterSpacing: '0.05em' },
};
