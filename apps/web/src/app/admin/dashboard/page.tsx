'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { getToken, getDashboard, type DashboardData } from '@/lib/api';
import { colors, fonts, radius } from '@/lib/brand';

const CHART_COLORS = ['#4CAF50', '#42A5F5', '#FFA726', '#EF5350', '#AB47BC', '#26C6DA', '#FF7043', '#66BB6A', '#5C6BC0', '#EC407A'];

const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtK = (v: number) => v >= 1000 ? `R$ ${(v / 1000).toFixed(1)}k` : fmt(v);

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    const token = getToken();
    if (!token) { router.replace('/login'); return; }
    getDashboard(token)
      .then(setData)
      .catch((e) => setErro(e instanceof Error ? e.message : 'Erro'))
      .finally(() => setCarregando(false));
  }, [router]);

  if (carregando) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '2rem' }}>
      <span style={s.spinner} />
      <span style={{ color: colors.textSecondary, fontFamily: fonts.body }}>Carregando dashboard…</span>
    </div>
  );
  if (erro) return <p style={{ color: colors.error, fontFamily: fonts.body }}>{erro}</p>;
  if (!data) return null;

  const { kpis } = data;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <h1 style={s.titulo}>Dashboard</h1>

      {/* KPIs */}
      <div style={s.kpiGrid}>
        <KpiCard label="Total de Entregas" value={kpis.totalEntregas.toLocaleString('pt-BR')} icon="📦" />
        <KpiCard label="Valor Movimentado" value={fmtK(kpis.valorTotal)} icon="💰" />
        <KpiCard label="Ticket Médio" value={fmtK(kpis.ticketMedio)} icon="🎯" />
        <KpiCard label="NF-e Únicas" value={kpis.nfeUnicas.toLocaleString('pt-BR')} icon="📄" />
        <KpiCard label="Peso Total" value={`${kpis.pesoTotal.toLocaleString('pt-BR')} kg`} icon="⚖️" />
        <KpiCard label="Tempo Médio Emissão→Entrega" value={`${kpis.tempoMedioHoras}h`} icon="⏱️" />
      </div>

      {/* Linha 1: Entregas por período + Status */}
      <div style={s.row2}>
        <ChartCard title="Entregas por Período" flex={2}>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data.entregasPorPeriodo}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
              <XAxis dataKey="data" tick={tickStyle} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={tickStyle} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="count" stroke={colors.accent} strokeWidth={2} dot={false} name="Entregas" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Status das Entregas" flex={1}>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={data.entregasPorStatus} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                {data.entregasPorStatus.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Linha 2: Entregas por entregador + Valor por entregador */}
      <div style={s.row2}>
        <ChartCard title="Entregas por Entregador" flex={1}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.entregasPorEntregador} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
              <XAxis type="number" tick={tickStyle} />
              <YAxis dataKey="nome" type="category" tick={tickStyle} width={100} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" fill={colors.accent} name="Entregas" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Valor Movimentado por Entregador" flex={1}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.valorPorEntregador} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
              <XAxis type="number" tick={tickStyle} tickFormatter={(v) => fmtK(v)} />
              <YAxis dataKey="nome" type="category" tick={tickStyle} width={100} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmt(Number(v))} />
              <Bar dataKey="valor" fill="#42A5F5" name="Valor" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Linha 3: Faturamento + Tempo emissão→entrega */}
      <div style={s.row2}>
        <ChartCard title="Faturamento ao Longo do Tempo" flex={2}>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data.faturamentoPorPeriodo}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
              <XAxis dataKey="data" tick={tickStyle} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={tickStyle} tickFormatter={(v) => fmtK(v)} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmt(Number(v))} />
              <Line type="monotone" dataKey="valor" stroke="#FFA726" strokeWidth={2} dot={false} name="Faturamento" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Tempo Emissão → Entrega (horas)" flex={1}>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data.tempoPorPeriodo}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
              <XAxis dataKey="data" tick={tickStyle} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={tickStyle} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => `${Number(v)}h`} />
              <Line type="monotone" dataKey="horas" stroke="#AB47BC" strokeWidth={2} dot={false} name="Horas" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Linha 4: Distribuição de valores + Itens por nota */}
      <div style={s.row2}>
        <ChartCard title="Distribuição de Valores das NF-e" flex={1}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.distribuicaoValores}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
              <XAxis dataKey="faixa" tick={tickStyle} />
              <YAxis tick={tickStyle} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" fill="#26C6DA" name="Notas" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Quantidade de Itens por Nota" flex={1}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.itensPorNota}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
              <XAxis dataKey="faixa" tick={tickStyle} />
              <YAxis tick={tickStyle} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" fill="#FF7043" name="Notas" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Composição de valores */}
      <ChartCard title="Composição dos Valores (Total)">
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', padding: '0.5rem 0' }}>
          {[
            { label: 'Produtos', value: data.composicaoValores.produtos, color: colors.accent },
            { label: 'Frete', value: data.composicaoValores.frete, color: '#FFA726' },
            { label: 'Desconto', value: data.composicaoValores.desconto, color: '#EF5350' },
          ].map((item) => (
            <div key={item.label} style={{ flex: 1, minWidth: 160, backgroundColor: colors.bgSecondary, borderRadius: radius.md, padding: '1rem 1.25rem', borderLeft: `3px solid ${item.color}` }}>
              <p style={{ margin: 0, fontSize: '0.75rem', color: colors.textMuted, fontFamily: fonts.body, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.label}</p>
              <p style={{ margin: '0.25rem 0 0', fontSize: '1.25rem', fontWeight: 700, color: colors.textPrimary, fontFamily: fonts.title }}>{fmt(item.value)}</p>
            </div>
          ))}
        </div>
      </ChartCard>

      {/* Top emitentes + destinatários */}
      <div style={s.row2}>
        <ChartCard title="Top 10 Emitentes" flex={1}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.topEmitentes} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
              <XAxis type="number" tick={tickStyle} />
              <YAxis dataKey="nome" type="category" tick={tickStyle} width={120} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" fill={colors.accent} name="Notas" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Top 10 Destinatários" flex={1}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.topDestinatarios} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
              <XAxis type="number" tick={tickStyle} />
              <YAxis dataKey="nome" type="category" tick={tickStyle} width={120} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" fill="#42A5F5" name="Notas" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Notas por UF */}
      <div style={s.row2}>
        <ChartCard title="Notas por UF — Emitente" flex={1}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.notasPorUf.emitente}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
              <XAxis dataKey="uf" tick={tickStyle} />
              <YAxis tick={tickStyle} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" fill={colors.accent} name="Notas" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Notas por UF — Destinatário" flex={1}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.notasPorUf.destinatario}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
              <XAxis dataKey="uf" tick={tickStyle} />
              <YAxis tick={tickStyle} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" fill="#42A5F5" name="Notas" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Natureza da operação */}
      <div style={s.row2}>
        <ChartCard title="Natureza da Operação" flex={1}>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={data.naturezaOperacao} dataKey="count" nameKey="natureza" cx="50%" cy="50%" outerRadius={80}>
                {data.naturezaOperacao.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: '0.75rem', color: colors.textSecondary }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Mapa de entregas (pontos geo) */}
        <ChartCard title="Pontos de Entrega" flex={1}>
          {data.entregas.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 220, color: colors.textMuted, fontFamily: fonts.body, fontSize: '0.875rem' }}>
              Nenhuma entrega com coordenadas
            </div>
          ) : (
            <div style={{ height: 220, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', fontFamily: fonts.body }}>
                <thead>
                  <tr>
                    {['Destinatário', 'Valor', 'Lat', 'Lng'].map((h) => (
                      <th key={h} style={{ padding: '6px 8px', textAlign: 'left', color: colors.textMuted, borderBottom: `1px solid ${colors.border}`, fontSize: '0.7rem', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.entregas.slice(0, 50).map((e, i) => (
                    <tr key={i}>
                      <td style={{ padding: '5px 8px', color: colors.textPrimary, borderBottom: `1px solid ${colors.border}` }}>{e.dest_nome || '—'}</td>
                      <td style={{ padding: '5px 8px', color: colors.accent, borderBottom: `1px solid ${colors.border}` }}>{e.valor > 0 ? fmtK(e.valor) : '—'}</td>
                      <td style={{ padding: '5px 8px', color: colors.textSecondary, borderBottom: `1px solid ${colors.border}`, fontFamily: 'monospace' }}>{e.lat.toFixed(4)}</td>
                      <td style={{ padding: '5px 8px', color: colors.textSecondary, borderBottom: `1px solid ${colors.border}`, fontFamily: 'monospace' }}>{e.lng.toFixed(4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  );
}

function KpiCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div style={s.kpiCard}>
      <span style={{ fontSize: '1.5rem' }}>{icon}</span>
      <div>
        <p style={{ margin: 0, fontSize: '0.7rem', color: colors.textMuted, fontFamily: fonts.body, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
        <p style={{ margin: '0.2rem 0 0', fontSize: '1.3rem', fontWeight: 700, color: colors.textPrimary, fontFamily: fonts.title }}>{value}</p>
      </div>
    </div>
  );
}

function ChartCard({ title, children, flex }: { title: string; children: React.ReactNode; flex?: number }) {
  return (
    <div style={{ ...s.card, flex: flex ?? 1 }}>
      <p style={s.chartTitle}>{title}</p>
      {children}
    </div>
  );
}

const tickStyle = { fill: colors.textMuted, fontSize: 11, fontFamily: fonts.body };
const tooltipStyle = { backgroundColor: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: radius.md, color: colors.textPrimary, fontFamily: fonts.body, fontSize: '0.8rem' };

const s: Record<string, React.CSSProperties> = {
  titulo: { fontSize: '1.5rem', fontWeight: 700, color: colors.textPrimary, margin: '0 0 0.25rem', fontFamily: fonts.title },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' },
  kpiCard: { backgroundColor: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.875rem' },
  row2: { display: 'flex', gap: '0.75rem', flexWrap: 'wrap' },
  card: { backgroundColor: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: '1.25rem', minWidth: 0 },
  chartTitle: { margin: '0 0 1rem', fontSize: '0.8rem', fontWeight: 600, color: colors.textSecondary, fontFamily: fonts.title, textTransform: 'uppercase', letterSpacing: '0.05em' },
  spinner: { display: 'inline-block', width: 18, height: 18, border: `2px solid ${colors.border}`, borderTopColor: colors.accent, borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
};
