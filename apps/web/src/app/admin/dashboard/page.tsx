'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { getToken, getDashboard, getClientesDashboard, listarUsuarios, type DashboardData, type UsuarioResponse } from '@/lib/api';
import { colors, fonts, radius } from '@/lib/brand';

const CHART_COLORS = ['#4CAF50', '#42A5F5', '#FFA726', '#EF5350', '#AB47BC', '#26C6DA', '#FF7043', '#66BB6A', '#5C6BC0', '#EC407A'];
const STATUS_LABELS: Record<string, string> = { ENVIADO: 'Entregue', PENDENTE: 'Pendente', ERRO: 'Erro' };
const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtK = (v: number) => v >= 1000 ? `R$ ${(v / 1000).toFixed(1)}k` : fmt(v);

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [clientes, setClientes] = useState<string[]>([]);
  const [entregadores, setEntregadores] = useState<UsuarioResponse[]>([]);

  const hoje = new Date();
  const primeiroDiaMes = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-01`;
  const ultimoDiaMes = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate()).padStart(2, '0')}`;

  const [dataInicio, setDataInicio] = useState(primeiroDiaMes);
  const [dataFim, setDataFim] = useState(ultimoDiaMes);
  const [filtroAtivo, setFiltroAtivo] = useState<'dia' | 'mes' | 'ano' | 'custom'>('mes');
  const [cliente, setCliente] = useState('');
  const [entregadorId, setEntregadorId] = useState('');

  function aplicarPreset(preset: 'dia' | 'mes' | 'ano') {
    const now = new Date();
    setFiltroAtivo(preset);
    if (preset === 'dia') { const d = now.toISOString().slice(0, 10); setDataInicio(d); setDataFim(d); }
    else if (preset === 'mes') {
      const ini = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      const fim = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()).padStart(2, '0')}`;
      setDataInicio(ini); setDataFim(fim);
    } else { setDataInicio(`${now.getFullYear()}-01-01`); setDataFim(`${now.getFullYear()}-12-31`); }
  }

  const carregar = useCallback((ini: string, fim: string, cli = cliente, entId = entregadorId) => {
    const token = getToken();
    if (!token) { router.replace('/login'); return; }
    setCarregando(true); setErro('');
    getDashboard(token, {
      data_inicio: ini ? `${ini}T00:00:00` : undefined,
      data_fim: fim ? `${fim}T23:59:59` : undefined,
      cliente: cli || undefined,
      entregador_id: entId || undefined,
    }).then(setData).catch((e) => setErro(e instanceof Error ? e.message : 'Erro')).finally(() => setCarregando(false));
  }, [router, cliente, entregadorId]);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    getClientesDashboard(token).then(setClientes).catch(() => {});
    listarUsuarios(token).then(setEntregadores).catch(() => {});
    carregar(dataInicio, dataFim);
  }, []); // eslint-disable-line

  function handleFiltrar(e: React.FormEvent) {
    e.preventDefault(); setFiltroAtivo('custom');
    carregar(dataInicio, dataFim, cliente, entregadorId);
  }

  function handleLimpar() {
    setDataInicio(''); setDataFim(''); setCliente(''); setEntregadorId('');
    setFiltroAtivo('custom'); carregar('', '', '', '');
  }

  if (carregando) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '2rem' }}>
      <span style={s.spinner} />
      <span style={{ color: colors.textSecondary, fontFamily: fonts.body }}>Carregando dashboard…</span>
    </div>
  );
  if (erro) return <p style={{ color: colors.error, fontFamily: fonts.body }}>{erro}</p>;
  if (!data) return null;

  const { kpis } = data;
  const statusNormalizado = data.entregasPorStatus.map((st) => ({ ...st, status: STATUS_LABELS[st.status] ?? st.status }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <h1 style={s.titulo}>Dashboard</h1>

      {/* Filtros */}
      <form onSubmit={handleFiltrar} style={s.filtroCard}>
        <div style={s.filtroPresets}>
          {(['dia', 'mes', 'ano'] as const).map((p) => (
            <button key={p} type="button" onClick={() => {
              aplicarPreset(p);
              const now = new Date();
              const ini = p === 'dia' ? now.toISOString().slice(0, 10) : p === 'mes' ? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01` : `${now.getFullYear()}-01-01`;
              const fim = p === 'dia' ? now.toISOString().slice(0, 10) : p === 'mes' ? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()).padStart(2, '0')}` : `${now.getFullYear()}-12-31`;
              carregar(ini, fim, cliente, entregadorId);
            }} style={{ ...s.btnPreset, ...(filtroAtivo === p ? s.btnPresetAtivo : {}) }}>
              {p === 'dia' ? 'Hoje' : p === 'mes' ? 'Este mês' : 'Este ano'}
            </button>
          ))}
          <button type="button" onClick={handleLimpar} style={{ ...s.btnPreset, ...(filtroAtivo === 'custom' && !dataInicio && !dataFim ? s.btnPresetAtivo : {}) }}>Todos</button>
        </div>
        <div style={s.filtroInputs}>
          <div style={s.filtroGrupo}>
            <label style={s.filtroLabel}>Cliente</label>
            <select value={cliente} onChange={(e) => { setCliente(e.target.value); setFiltroAtivo('custom'); }} style={{ ...s.filtroInput, minWidth: 200 }}>
              <option value="">Todos os clientes</option>
              {clientes.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div style={s.filtroGrupo}>
            <label style={s.filtroLabel}>Entregador</label>
            <select value={entregadorId} onChange={(e) => { setEntregadorId(e.target.value); setFiltroAtivo('custom'); }} style={{ ...s.filtroInput, minWidth: 160 }}>
              <option value="">Todos</option>
              {entregadores.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
            </select>
          </div>
          <div style={s.filtroGrupo}>
            <label style={s.filtroLabel}>De</label>
            <input type="date" value={dataInicio} onChange={(e) => { setDataInicio(e.target.value); setFiltroAtivo('custom'); }} style={s.filtroInput} />
          </div>
          <div style={s.filtroGrupo}>
            <label style={s.filtroLabel}>Até</label>
            <input type="date" value={dataFim} onChange={(e) => { setDataFim(e.target.value); setFiltroAtivo('custom'); }} style={s.filtroInput} />
          </div>
          <button type="submit" style={s.btnAplicar} disabled={carregando}>{carregando ? '…' : 'Aplicar'}</button>
        </div>
      </form>

      {/* KPIs */}
      <div style={s.kpiGrid}>
        <KpiCard label="Total de Entregas" value={kpis.totalEntregas.toLocaleString('pt-BR')} icon="📦" />
        <KpiCard label="Valor Movimentado" value={fmtK(kpis.valorTotal)} icon="💰" />
        <KpiCard label="Ticket Médio" value={fmtK(kpis.ticketMedio)} icon="🎯" />
        <KpiCard label="NF-e Únicas" value={kpis.nfeUnicas.toLocaleString('pt-BR')} icon="📄" />
        <KpiCard label="Peso Total" value={`${kpis.pesoTotal.toLocaleString('pt-BR')} kg`} icon="⚖️" />
        <KpiCard label="Tempo Médio Emissão→Entrega" value={`${kpis.tempoMedioHoras}h`} icon="⏱️" />
      </div>

      {/* DESTAQUE: Tempo Emissão → Entrega */}
      <ChartCard title="⏱ Tempo Emissão → Entrega (horas)" destaque>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data.tempoPorPeriodo}>
            <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
            <XAxis dataKey="data" tick={tickStyle} tickFormatter={(v) => v.slice(5)} />
            <YAxis tick={tickStyle} unit="h" />
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${Number(v)}h`, 'Horas']} />
            <Line type="monotone" dataKey="horas" stroke="#AB47BC" strokeWidth={3} dot={{ r: 3, fill: '#AB47BC' }} name="Horas" />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Entregas por período (barras) + Status */}
      <div style={s.row2}>
        <ChartCard title="Entregas por Período" flex={2}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.entregasPorPeriodo}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
              <XAxis dataKey="data" tick={tickStyle} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={tickStyle} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" fill={colors.accent} name="Entregas" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Status das Entregas" flex={1}>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={statusNormalizado} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={75}
                label={({ percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`}
                labelLine={false}>
                {statusNormalizado.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: '0.75rem', color: colors.textSecondary, fontFamily: fonts.body }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Entregas por entregador + Valor por entregador */}
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

      {/* Faturamento */}
      <ChartCard title="Faturamento ao Longo do Tempo">
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

      {/* Distribuição de valores + Itens por nota */}
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
          {[{ label: 'Produtos', value: data.composicaoValores.produtos, color: colors.accent }, { label: 'Frete', value: data.composicaoValores.frete, color: '#FFA726' }, { label: 'Desconto', value: data.composicaoValores.desconto, color: '#EF5350' }].map((item) => (
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

      {/* Natureza da operação + Pontos de entrega */}
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
        <ChartCard title="Pontos de Entrega" flex={1}>
          {data.entregas.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 220, color: colors.textMuted, fontFamily: fonts.body, fontSize: '0.875rem' }}>Nenhuma entrega com coordenadas</div>
          ) : (
            <div style={{ height: 220, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', fontFamily: fonts.body }}>
                <thead><tr>{['Destinatário', 'Valor', 'Lat', 'Lng'].map((h) => <th key={h} style={{ padding: '6px 8px', textAlign: 'left', color: colors.textMuted, borderBottom: `1px solid ${colors.border}`, fontSize: '0.7rem', textTransform: 'uppercase' }}>{h}</th>)}</tr></thead>
                <tbody>{data.entregas.slice(0, 50).map((e, i) => (
                  <tr key={i}>
                    <td style={{ padding: '5px 8px', color: colors.textPrimary, borderBottom: `1px solid ${colors.border}` }}>{e.dest_nome || '—'}</td>
                    <td style={{ padding: '5px 8px', color: colors.accent, borderBottom: `1px solid ${colors.border}` }}>{e.valor > 0 ? fmtK(e.valor) : '—'}</td>
                    <td style={{ padding: '5px 8px', color: colors.textSecondary, borderBottom: `1px solid ${colors.border}`, fontFamily: 'monospace' }}>{e.lat.toFixed(4)}</td>
                    <td style={{ padding: '5px 8px', color: colors.textSecondary, borderBottom: `1px solid ${colors.border}`, fontFamily: 'monospace' }}>{e.lng.toFixed(4)}</td>
                  </tr>
                ))}</tbody>
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

function ChartCard({ title, children, flex, destaque }: { title: string; children: React.ReactNode; flex?: number; destaque?: boolean }) {
  return (
    <div style={{ ...s.card, flex: flex ?? 1, ...(destaque ? { border: '1px solid rgba(171,71,188,0.4)', boxShadow: '0 0 20px rgba(171,71,188,0.1)' } : {}) }}>
      <p style={{ ...s.chartTitle, ...(destaque ? { color: '#AB47BC', fontSize: '0.875rem' } : {}) }}>{title}</p>
      {children}
    </div>
  );
}

const tickStyle = { fill: colors.textMuted, fontSize: 11, fontFamily: fonts.body };
const tooltipStyle = { backgroundColor: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: radius.md, color: colors.textPrimary, fontFamily: fonts.body, fontSize: '0.8rem' };

const s: Record<string, React.CSSProperties> = {
  titulo: { fontSize: '1.5rem', fontWeight: 700, color: colors.textPrimary, margin: '0 0 0.25rem', fontFamily: fonts.title },
  filtroCard: { backgroundColor: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: '1rem 1.25rem', display: 'flex', flexWrap: 'wrap' as const, gap: '0.75rem', alignItems: 'flex-end', justifyContent: 'space-between' },
  filtroPresets: { display: 'flex', gap: '0.375rem', flexWrap: 'wrap' as const },
  btnPreset: { padding: '0.375rem 0.875rem', fontSize: '0.8rem', fontWeight: 500, borderRadius: radius.full, border: `1px solid ${colors.border}`, backgroundColor: 'transparent', color: colors.textSecondary, cursor: 'pointer', fontFamily: fonts.body },
  btnPresetAtivo: { backgroundColor: colors.accentLight, color: colors.accent, borderColor: colors.accentBorder },
  filtroInputs: { display: 'flex', gap: '0.5rem', alignItems: 'flex-end', flexWrap: 'wrap' as const },
  filtroGrupo: { display: 'flex', flexDirection: 'column' as const, gap: '3px' },
  filtroLabel: { fontSize: '0.7rem', color: colors.textMuted, fontFamily: fonts.body, textTransform: 'uppercase' as const, letterSpacing: '0.05em' },
  filtroInput: { padding: '0.4rem 0.75rem', border: `1px solid ${colors.border}`, borderRadius: radius.sm, fontSize: '0.85rem', backgroundColor: colors.bgSecondary, color: colors.textPrimary, fontFamily: fonts.body, outline: 'none' },
  btnAplicar: { padding: '0.4rem 1rem', backgroundColor: colors.accent, color: '#fff', border: 'none', borderRadius: radius.sm, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', fontFamily: fonts.title },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' },
  kpiCard: { backgroundColor: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.875rem' },
  row2: { display: 'flex', gap: '0.75rem', flexWrap: 'wrap' as const },
  card: { backgroundColor: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: '1.25rem', minWidth: 0 },
  chartTitle: { margin: '0 0 1rem', fontSize: '0.8rem', fontWeight: 600, color: colors.textSecondary, fontFamily: fonts.title, textTransform: 'uppercase' as const, letterSpacing: '0.05em' },
  spinner: { display: 'inline-block', width: 18, height: 18, border: `2px solid ${colors.border}`, borderTopColor: colors.accent, borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
};
