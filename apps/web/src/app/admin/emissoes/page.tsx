'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  getToken,
  listarNfeEmitidas,
  dispararCaptura,
  getControleNsu,
  getCertificadoInfo,
  uploadCertificado,
  removerCertificado,
  type NfeEmitidaResponse,
  type CertificadoInfo,
} from '@/lib/api';
import { colors, fonts, radius, shadow } from '@/lib/brand';

type Aba = 'emissoes' | 'certificado';

export default function EmissoesPage() {
  const router = useRouter();
  const [aba, setAba] = useState<Aba>('emissoes');

  return (
    <div>
      <div style={s.header}>
        <h1 style={s.titulo}>Emissões-NFe</h1>
        <p style={s.subtitulo}>NF-e emitidas pelo CNPJ da empresa, capturadas automaticamente da SEFAZ</p>
      </div>

      <div style={s.abas}>
        {(['emissoes', 'certificado'] as Aba[]).map((a) => (
          <button key={a} onClick={() => setAba(a)} style={{ ...s.aba, ...(aba === a ? s.abaAtiva : {}) }}>
            {a === 'emissoes' && '📄 NF-e Emitidas'}
            {a === 'certificado' && '🔐 Certificado Digital'}
          </button>
        ))}
      </div>

      {aba === 'emissoes' && <AbaEmissoes router={router} />}
      {aba === 'certificado' && <AbaCertificado />}
    </div>
  );
}

// ─── Aba: NF-e Emitidas ──────────────────────────────────────────────────────

function AbaEmissoes({ router }: { router: ReturnType<typeof useRouter> }) {
  const [nfes, setNfes] = useState<NfeEmitidaResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [carregando, setCarregando] = useState(true);
  const [capturando, setCapturando] = useState(false);
  const [erro, setErro] = useState('');
  const [msgCaptura, setMsgCaptura] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroInicio, setFiltroInicio] = useState('');
  const [filtroFim, setFiltroFim] = useState('');
  const [filtroChave, setFiltroChave] = useState('');
  const [cooldownMin, setCooldownMin] = useState(0);
  const LIMIT = 20;

  // Refs para ler filtros atuais sem recriar o callback
  const filtrosRef = React.useRef({ filtroStatus, filtroInicio, filtroFim, filtroChave });
  filtrosRef.current = { filtroStatus, filtroInicio, filtroFim, filtroChave };

  const buscar = useCallback(async (p = 1) => {
    const token = getToken();
    if (!token) { router.replace('/login'); return; }
    setCarregando(true); setErro('');
    const f = filtrosRef.current;
    try {
      const res = await listarNfeEmitidas(token, {
        page: p, limit: LIMIT,
        status: f.filtroStatus || undefined,
        data_inicio: f.filtroInicio || undefined,
        data_fim: f.filtroFim || undefined,
        chave_nfe: f.filtroChave || undefined,
      });
      setNfes(res.data); setTotal(res.total);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar');
    } finally { setCarregando(false); }
  }, [router]);

  // Carrega cooldown do controle NSU
  const atualizarCooldown = useCallback(async () => {
    const token = getToken(); if (!token) return;
    const ctrl = await getControleNsu(token);
    if (ctrl?.atualizado_em && ctrl.ult_nsu === ctrl.max_nsu) {
      const diff = (Date.now() - new Date(ctrl.atualizado_em).getTime()) / 60000;
      setCooldownMin(diff < 60 ? Math.ceil(60 - diff) : 0);
    } else {
      setCooldownMin(0);
    }
  }, []);

  // Busca inicial apenas uma vez
  useEffect(() => { buscar(1); atualizarCooldown(); }, [buscar, atualizarCooldown]);

  // Timer para atualizar cooldown a cada minuto
  useEffect(() => {
    if (cooldownMin <= 0) return;
    const timer = setTimeout(() => setCooldownMin((m) => Math.max(0, m - 1)), 60000);
    return () => clearTimeout(timer);
  }, [cooldownMin]);

  async function handleCapturar() {
    const token = getToken();
    if (!token) return;
    setCapturando(true); setErro(''); setMsgCaptura('');
    try {
      const resultado = await dispararCaptura(token);
      setMsgCaptura(resultado.message);
      if (resultado.documentos && resultado.documentos > 0) {
        buscar(1);
      }
      atualizarCooldown();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao capturar NF-e');
    } finally { setCapturando(false); }
  }

  const totalPaginas = Math.ceil(total / LIMIT);
  const botaoDesabilitado = capturando || cooldownMin > 0;

  const hoje = new Date().toISOString().slice(0, 10);
  const d90 = new Date(); d90.setDate(d90.getDate() - 90);
  const limite90dias = d90.toISOString().slice(0, 10);

  return (
    <div>
      {/* Aviso sobre NF-e vs NFS-e */}
      <div style={{ backgroundColor: colors.infoBg, border: `1px solid ${colors.infoBorder}`, borderRadius: radius.lg, padding: '0.75rem 1rem', marginBottom: '0.75rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
        <span style={{ flexShrink: 0 }}>ℹ️</span>
        <p style={{ margin: 0, fontSize: '0.8rem', color: colors.info, fontFamily: fonts.body, lineHeight: 1.5 }}>
          Esta seção exibe apenas NF-e (modelo 55 — mercadorias/produtos) capturadas da SEFAZ estadual.
          Notas Fiscais de Serviço (NFS-e) são emitidas pelas prefeituras municipais e não estão disponíveis neste painel.
          A captura ocorre automaticamente a cada hora e também ao configurar o certificado digital.
        </p>
      </div>

      {/* Mensagem da última captura */}
      {msgCaptura && (
        <div style={{ backgroundColor: colors.bgSecondary, border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: '0.6rem 1rem', marginBottom: '0.75rem' }}>
          <p style={{ margin: 0, fontSize: '0.8rem', color: colors.textSecondary, fontFamily: fonts.body }}>{msgCaptura}</p>
        </div>
      )}

      {/* Filtros */}
      <div style={{ ...s.card, position: 'relative', overflow: 'hidden' }}>
        <div style={s.filtrosGrid}>
          <div style={s.campo}>
            <label style={s.label}>Status</label>
            <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} style={s.input}>
              <option value="">Todos</option>
              <option value="PENDENTE">Pendente</option>
              <option value="COMPLETA">Completa</option>
              <option value="CANCELADA">Cancelada</option>
              <option value="ERRO">Erro</option>
            </select>
          </div>
          <div style={s.campo}>
            <label style={s.label}>Data início</label>
            <input type="date" value={filtroInicio} onChange={(e) => setFiltroInicio(e.target.value)} max={filtroFim || hoje} min={limite90dias} style={s.input} />
          </div>
          <div style={s.campo}>
            <label style={s.label}>Data fim</label>
            <input type="date" value={filtroFim} onChange={(e) => setFiltroFim(e.target.value)} max={hoje} min={filtroInicio || limite90dias} style={s.input} />
          </div>
          <div style={s.campo}>
            <label style={s.label}>Chave NF-e</label>
            <input type="text" value={filtroChave} onChange={(e) => setFiltroChave(e.target.value)} placeholder="Busca parcial" style={s.input} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button onClick={() => { setPage(1); buscar(1); }} style={s.btnPrimario}>Filtrar</button>
          <button onClick={() => {
            setFiltroStatus(''); setFiltroInicio(''); setFiltroFim(''); setFiltroChave('');
            filtrosRef.current = { filtroStatus: '', filtroInicio: '', filtroFim: '', filtroChave: '' };
            buscar(1);
          }} style={s.btnSecundario}>Limpar</button>
          <div style={{ flex: 1 }} />
          <button
            onClick={handleCapturar}
            disabled={botaoDesabilitado}
            title={cooldownMin > 0 ? `Aguarde ${cooldownMin} min para consultar novamente` : ''}
            style={{ ...s.btnPrimario, backgroundColor: colors.info, opacity: botaoDesabilitado ? 0.5 : 1, cursor: botaoDesabilitado ? 'not-allowed' : 'pointer' }}
          >
            {capturando ? '⏳ Consultando…' : cooldownMin > 0 ? `⏳ Aguarde ${cooldownMin} min` : '⚡ Consultar SEFAZ'}
          </button>
        </div>
      </div>

      {erro && <p style={s.erro}>{erro}</p>}

      {carregando ? (
        <div style={s.loadingWrap}><span style={s.spinner} /><span style={{ color: colors.textSecondary, fontFamily: fonts.body }}>Carregando…</span></div>
      ) : nfes.length === 0 ? (
        <div style={s.vazio}>
          <span style={{ fontSize: '2.5rem' }}>📭</span>
          <p style={{ color: colors.textSecondary, fontFamily: fonts.body, margin: 0 }}>Nenhuma NF-e encontrada.</p>
          <p style={{ color: colors.textMuted, fontFamily: fonts.body, fontSize: '0.8rem', margin: 0 }}>Configure o certificado digital na aba "Certificado Digital". A captura ocorre automaticamente.</p>
        </div>
      ) : (
        <>
          <div style={s.tabelaWrapper}>
            <table style={s.tabela}>
              <thead>
                <tr>
                  {['Nº / Série', 'Destinatário', 'UF', 'Valor Total', 'Emissão', 'Status', 'Entrega', 'DANFE'].map((h) => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {nfes.map((nfe) => (
                  <tr key={nfe.id} style={s.tr}>
                    <td style={{ ...s.td, fontFamily: 'monospace', fontSize: '0.8rem' }}>
                      {nfe.numero_nfe ?? '—'}{nfe.serie ? `/${nfe.serie}` : ''}
                    </td>
                    <td style={{ ...s.td, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }} title={nfe.dest_nome ?? ''}>
                      <span style={{ display: 'block' }}>{nfe.dest_nome ?? '—'}</span>
                      {nfe.dest_cnpj_cpf && <span style={{ fontSize: '0.7rem', color: colors.textMuted, fontFamily: 'monospace' }}>{nfe.dest_cnpj_cpf}</span>}
                    </td>
                    <td style={s.td}>{nfe.dest_uf ?? '—'}</td>
                    <td style={{ ...s.td, fontWeight: 600 }}>
                      {nfe.valor_total != null
                        ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(nfe.valor_total))
                        : '—'}
                    </td>
                    <td style={s.td}>
                      {nfe.data_emissao ? new Date(nfe.data_emissao).toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td style={s.td}><StatusBadge status={nfe.status} /></td>
                    <td style={s.td}>
                      {nfe.entrega_chave_nfe
                        ? <span style={{ color: colors.success, fontSize: '0.8rem' }}>✅ Registrada</span>
                        : <span style={{ color: colors.textMuted, fontSize: '0.8rem' }}>—</span>}
                    </td>
                    <td style={s.td}>
                      {nfe.danfe_pdf_base64 ? (
                        <button
                          onClick={() => abrirDanfe(nfe.danfe_pdf_base64!)}
                          style={s.btnLink}
                        >
                          PDF →
                        </button>
                      ) : <span style={{ color: colors.textMuted, fontSize: '0.8rem' }}>⏳</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPaginas > 1 && (
            <div style={s.paginacao}>
              <button onClick={() => { setPage(page - 1); buscar(page - 1); }} disabled={page === 1} style={page === 1 ? s.btnPagDisabled : s.btnPag}>← Anterior</button>
              <span style={{ fontSize: '0.875rem', color: colors.textSecondary, fontFamily: fonts.body }}>Página {page} de {totalPaginas} ({total} registros)</span>
              <button onClick={() => { setPage(page + 1); buscar(page + 1); }} disabled={page === totalPaginas} style={page === totalPaginas ? s.btnPagDisabled : s.btnPag}>Próxima →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Aba: Certificado ────────────────────────────────────────────────────────

function AbaCertificado() {
  const router = useRouter();
  const [info, setInfo] = useState<CertificadoInfo | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [senha, setSenha] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  const carregarInfo = useCallback(async () => {
    const token = getToken();
    if (!token) { router.replace('/login'); return; }
    setCarregando(true);
    try {
      const data = await getCertificadoInfo(token);
      setInfo(data);
    } catch { /* sem certificado ainda */ setInfo({ configurado: false, titular: null, validade: null, vencido: false }); }
    finally { setCarregando(false); }
  }, [router]);

  useEffect(() => { carregarInfo(); }, [carregarInfo]);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!arquivo || !senha) return;
    const token = getToken();
    if (!token) return;
    setEnviando(true); setErro(''); setSucesso('');
    try {
      const res = await uploadCertificado(token, arquivo, senha);
      setSucesso(`Certificado de "${res.titular}" configurado com sucesso.`);
      setArquivo(null); setSenha('');
      await carregarInfo();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao enviar certificado');
    } finally { setEnviando(false); }
  }

  async function handleRemover() {
    if (!confirm('Remover o certificado digital? A captura automática será desativada.')) return;
    const token = getToken();
    if (!token) return;
    await removerCertificado(token);
    await carregarInfo();
  }

  if (carregando) return <div style={s.loadingWrap}><span style={s.spinner} /></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: 560 }}>

      {/* Status atual */}
      <div style={s.card}>
        <p style={s.secaoTitulo}>Status do Certificado</p>
        {info?.configurado ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <InfoLinha label="Titular" value={info.titular ?? '—'} />
            <InfoLinha label="Validade" value={info.validade ? new Date(info.validade).toLocaleDateString('pt-BR') : '—'} />
            <InfoLinha label="Situação" value={info.vencido ? '⚠️ Vencido' : '✅ Válido'} />
            <button onClick={handleRemover} style={{ ...s.btnSecundario, color: colors.error, borderColor: colors.errorBorder, marginTop: '0.5rem', alignSelf: 'flex-start' }}>
              Remover Certificado
            </button>
          </div>
        ) : (
          <p style={{ color: colors.textMuted, fontFamily: fonts.body, fontSize: '0.875rem', margin: 0 }}>
            Nenhum certificado configurado. Faça o upload abaixo para ativar a captura automática de NF-e.
          </p>
        )}
      </div>

      {/* Upload */}
      <div style={s.card}>
        <p style={s.secaoTitulo}>{info?.configurado ? 'Substituir Certificado' : 'Configurar Certificado A1'}</p>
        <p style={{ color: colors.textMuted, fontFamily: fonts.body, fontSize: '0.8rem', margin: '0 0 1rem' }}>
          Aceita arquivos .pfx ou .p12. O certificado é armazenado criptografado e isolado por empresa.
        </p>
        <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={s.campo}>
            <label style={s.label}>Arquivo do Certificado (.pfx / .p12)</label>
            <input
              type="file"
              accept=".pfx,.p12"
              onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
              style={{ ...s.input, padding: '0.4rem' }}
            />
          </div>
          <div style={s.campo}>
            <label style={s.label}>Senha do Certificado</label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Senha do arquivo .pfx"
              style={s.input}
              autoComplete="new-password"
            />
          </div>
          {erro && <p style={s.erro}>{erro}</p>}
          {sucesso && <p style={{ color: colors.success, fontSize: '0.875rem', fontFamily: fonts.body }}>{sucesso}</p>}
          <button type="submit" disabled={!arquivo || !senha || enviando} style={{ ...s.btnPrimario, opacity: (!arquivo || !senha || enviando) ? 0.5 : 1 }}>
            {enviando ? 'Enviando…' : '🔐 Salvar Certificado'}
          </button>
        </form>
      </div>

    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, React.CSSProperties> = {
    COMPLETA: { backgroundColor: colors.successBg, color: colors.success, border: `1px solid ${colors.successBorder}` },
    PENDENTE: { backgroundColor: colors.warningBg, color: colors.warning, border: `1px solid ${colors.warningBorder}` },
    CANCELADA: { backgroundColor: colors.errorBg, color: colors.error, border: `1px solid ${colors.errorBorder}` },
    ERRO: { backgroundColor: colors.errorBg, color: colors.error, border: `1px solid ${colors.errorBorder}` },
  };
  return <span style={{ ...s.badge, ...(map[status] ?? {}) }}>{status}</span>;
}

function InfoLinha({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: `1px solid ${colors.border}` }}>
      <span style={{ fontSize: '0.8rem', color: colors.textMuted, fontFamily: fonts.body }}>{label}</span>
      <span style={{ fontSize: '0.875rem', color: colors.textPrimary, fontFamily: fonts.body }}>{value}</span>
    </div>
  );
}

function abrirDanfe(base64: string) {
  const byteChars = atob(base64);
  const byteArr = new Uint8Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) byteArr[i] = byteChars.charCodeAt(i);
  const blob = new Blob([byteArr], { type: 'application/pdf' });
  window.open(URL.createObjectURL(blob), '_blank');
}

// ─── Estilos ─────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  header: { marginBottom: '1.25rem' },
  titulo: { fontSize: '1.5rem', fontWeight: 700, color: colors.textPrimary, margin: '0 0 0.25rem', fontFamily: fonts.title },
  subtitulo: { fontSize: '0.875rem', color: colors.textSecondary, margin: 0, fontFamily: fonts.body },
  abas: { display: 'flex', gap: '0.25rem', marginBottom: '1.25rem', borderBottom: `1px solid ${colors.border}`, paddingBottom: '0' },
  aba: { padding: '0.5rem 1rem', background: 'none', border: 'none', borderBottomWidth: '2px', borderBottomStyle: 'solid', borderBottomColor: 'transparent', color: colors.textSecondary, fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer', fontFamily: fonts.body, marginBottom: '-1px' },
  abaAtiva: { color: colors.accent, borderBottomColor: colors.accent },
  card: { backgroundColor: colors.bgCard, borderRadius: radius.lg, padding: '1.25rem', border: `1px solid ${colors.border}` },
  filtrosGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' },
  campo: { display: 'flex', flexDirection: 'column', gap: '4px' },
  label: { fontSize: '0.75rem', fontWeight: 500, color: colors.textSecondary, fontFamily: fonts.body, textTransform: 'uppercase', letterSpacing: '0.04em' },
  input: { padding: '0.5rem 0.75rem', border: `1px solid ${colors.border}`, borderRadius: radius.sm, fontSize: '0.875rem', outline: 'none', backgroundColor: colors.bgSecondary, color: colors.textPrimary, fontFamily: fonts.body },
  btnPrimario: { padding: '0.5rem 1.25rem', backgroundColor: colors.accent, color: '#fff', border: 'none', borderRadius: radius.md, fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', fontFamily: fonts.title },
  btnSecundario: { padding: '0.5rem 1.25rem', backgroundColor: 'transparent', color: colors.textSecondary, border: `1px solid ${colors.border}`, borderRadius: radius.md, fontSize: '0.875rem', cursor: 'pointer', fontFamily: fonts.body },
  btnLink: { background: 'none', border: 'none', color: colors.accent, fontSize: '0.875rem', cursor: 'pointer', padding: 0, fontFamily: fonts.body, fontWeight: 500 },
  erro: { color: colors.error, fontSize: '0.875rem', fontFamily: fonts.body, margin: 0 },
  loadingWrap: { display: 'flex', alignItems: 'center', gap: '10px', padding: '2rem' },
  spinner: { display: 'inline-block', width: '18px', height: '18px', border: `2px solid ${colors.border}`, borderTopColor: colors.accent, borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  vazio: { backgroundColor: colors.bgCard, border: `1px dashed ${colors.border}`, borderRadius: radius.lg, padding: '3rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' },
  tabelaWrapper: { overflowX: 'auto', borderRadius: radius.lg, border: `1px solid ${colors.border}` },
  tabela: { width: '100%', borderCollapse: 'collapse', backgroundColor: colors.bgCard },
  th: { padding: '0.875rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: `1px solid ${colors.border}`, backgroundColor: colors.bgSecondary, fontFamily: fonts.body },
  td: { padding: '0.875rem 1rem', fontSize: '0.875rem', color: colors.textPrimary, borderBottom: `1px solid ${colors.border}`, fontFamily: fonts.body },
  tr: {},
  badge: { display: 'inline-block', padding: '3px 10px', borderRadius: '9999px', fontSize: '0.7rem', fontWeight: 600, fontFamily: fonts.body },
  paginacao: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginTop: '1.25rem' },
  btnPag: { padding: '0.375rem 0.875rem', border: `1px solid ${colors.border}`, borderRadius: radius.md, backgroundColor: colors.bgCard, color: colors.textSecondary, fontSize: '0.875rem', cursor: 'pointer', fontFamily: fonts.body },
  btnPagDisabled: { padding: '0.375rem 0.875rem', border: `1px solid ${colors.border}`, borderRadius: radius.md, backgroundColor: 'transparent', color: colors.textMuted, fontSize: '0.875rem', cursor: 'not-allowed', fontFamily: fonts.body },
  secaoTitulo: { margin: '0 0 0.75rem', fontSize: '0.75rem', fontWeight: 700, color: colors.textSecondary, fontFamily: fonts.title, textTransform: 'uppercase', letterSpacing: '0.07em' },
  capturaBanner: { marginBottom: '0.75rem', borderRadius: radius.lg, border: `1px solid ${colors.infoBorder}`, backgroundColor: colors.infoBg, overflow: 'hidden' },
  capturaProgressBar: { height: '3px', backgroundColor: 'transparent', overflow: 'hidden', position: 'relative' },
  capturaProgressFill: { position: 'absolute', top: 0, left: 0, height: '100%', width: '30%', backgroundColor: colors.info, borderRadius: '9999px', animation: 'capturaSlide 1.4s ease-in-out infinite' },
  capturaTexto: { display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 1rem', fontSize: '0.8rem', color: colors.info, fontFamily: fonts.body },
  capturaPulse: { display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: colors.info, flexShrink: 0, boxShadow: `0 0 0 0 ${colors.info}`, animation: 'capturaPulse 1.2s ease-out infinite' } as React.CSSProperties,
};
