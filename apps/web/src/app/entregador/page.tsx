'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import LeitorNFe from '@/components/LeitorNFe';
import CapturaImagem from '@/components/CapturaImagem';
import GeolocalizacaoCaptura from '@/components/GeolocalizacaoCaptura';
import {
  getToken, clearToken, uploadImagem, criarEntrega, finalizarEntrega,
  listarMinhasPendentes, listarCamposImagemAtivos, excluirEntregaPendente,
  listarColegas, solicitarTransferencia, listarTransferenciasRecebidas,
  listarTransferenciasEnviadas, responderTransferencia,
  contarNotificacoesNaoLidas, listarNotificacoes, marcarNotificacaoLida, marcarTodasNotificacoesLidas,
  type CampoImagemResponse, type EntregaResponse, type TransferenciaResponse, type NotificacaoResponse,
} from '@/lib/api';
import { colors, fonts, radius } from '@/lib/brand';

type Aba = 'nova' | 'pendentes';
type EstadoEnvio = 'idle' | 'enviando' | 'sucesso' | 'erro';
let contadorReset = 0;

export default function EntregadorPage() {
  const router = useRouter();
  const [nomeUsuario, setNomeUsuario] = useState('');
  const [aba, setAba] = useState<Aba>('nova');
  const [campos, setCampos] = useState<CampoImagemResponse[]>([]);
  const [pendentes, setPendentes] = useState<EntregaResponse[]>([]);
  const [carregandoPendentes, setCarregandoPendentes] = useState(false);
  const [naoLidas, setNaoLidas] = useState(0);
  const [painelNotif, setPainelNotif] = useState(false);
  const [notificacoes, setNotificacoes] = useState<NotificacaoResponse[]>([]);
  const [transferenciasRecebidas, setTransferenciasRecebidas] = useState<TransferenciaResponse[]>([]);

  useEffect(() => {
    const token = getToken();
    if (!token) { router.replace('/login'); return; }
    setNomeUsuario(localStorage.getItem('nome') ?? 'Entregador');

    listarCamposImagemAtivos(token)
      .then(setCampos)
      .catch(() => setCampos([
        { id: 'c', key: 'CANHOTO', label: 'Foto do Canhoto', obrigatorio: true, ordem: 0, ativo: true },
        { id: 'l', key: 'LOCAL', label: 'Foto do Local de Entrega', obrigatorio: true, ordem: 1, ativo: true },
      ]));

    const atualizarContador = () => contarNotificacoesNaoLidas(token).then(setNaoLidas).catch(() => {});
    atualizarContador();

    // Carrega pendentes e transferências recebidas já no início para o badge ficar visível
    const atualizarPendentes = () => {
      listarMinhasPendentes(token).then(setPendentes).catch(() => {});
      listarTransferenciasRecebidas(token).then(setTransferenciasRecebidas).catch(() => {});
    };
    atualizarPendentes();

    const intervalo = setInterval(() => { atualizarContador(); atualizarPendentes(); }, 30000);
    return () => clearInterval(intervalo);
  }, [router]);

  function carregarPendentes() {
    const token = getToken(); if (!token) return;
    setCarregandoPendentes(true);
    listarMinhasPendentes(token)
      .then(setPendentes)
      .finally(() => setCarregandoPendentes(false));
    listarTransferenciasRecebidas(token).then(setTransferenciasRecebidas).catch(() => {});
  }

  async function abrirNotificacoes() {
    const token = getToken(); if (!token) return;
    const lista = await listarNotificacoes(token).catch(() => []);
    setNotificacoes(lista);
    setPainelNotif(true);
    if (naoLidas > 0) {
      await marcarTodasNotificacoesLidas(token).catch(() => {});
      setNaoLidas(0);
    }
  }

  function handleAba(a: Aba) {
    setAba(a);
    if (a === 'pendentes') carregarPendentes();
  }

  return (
    <div style={s.page}>
      <header style={s.header}>
        <Image src="/logo1.png" alt="ADD+" width={100} height={40} style={{ objectFit: 'contain' }} />
        <div style={s.headerRight}>
          <span style={s.headerNome}>{nomeUsuario}</span>
          <button type="button" onClick={() => { clearToken(); router.replace('/login'); }} style={s.btnSair}>Sair</button>
        </div>
      </header>

      {/* Abas */}
      <div style={s.abas}>
        <button style={{ ...s.aba, ...(aba === 'nova' ? s.abaAtiva : {}) }} onClick={() => handleAba('nova')}>
          Nova Entrega
        </button>
        <button style={{ ...s.aba, ...(aba === 'pendentes' ? s.abaAtiva : {}) }} onClick={() => handleAba('pendentes')}>
          Pendentes {(pendentes.length + transferenciasRecebidas.length) > 0 && <span style={s.badge}>{pendentes.length + transferenciasRecebidas.length}</span>}
        </button>
      </div>

      <div style={s.body}>
        {aba === 'nova' && (
          <NovaEntregaForm
            campos={campos}
            onPendenteCriado={() => { carregarPendentes(); }}
          />
        )}
        {aba === 'pendentes' && (
          <PendentesLista
            pendentes={pendentes}
            carregando={carregandoPendentes}
            campos={campos}
            onFinalizado={() => { carregarPendentes(); }}
          />
        )}
      </div>

      {painelNotif && (
        <div style={s.notifOverlay} onClick={() => setPainelNotif(false)}>
          <div style={{ position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, backgroundColor: colors.bgCard, borderBottom: `1px solid ${colors.border}`, padding: '1rem', zIndex: 300, maxHeight: '70vh', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: colors.textPrimary, fontFamily: fonts.title }}>Notificações</span>
              <button onClick={() => setPainelNotif(false)} style={{ background: 'none', border: 'none', color: colors.textMuted, cursor: 'pointer', fontSize: 16 }}>✕</button>
            </div>
            {notificacoes.length === 0 ? (
              <p style={{ fontSize: 13, color: colors.textMuted, fontFamily: fonts.body, textAlign: 'center', padding: '1rem 0' }}>Nenhuma notificação.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto' }}>
                {notificacoes.map((n) => (
                  <div key={n.id} style={{ ...s.notifItem, opacity: n.lida ? 0.6 : 1 }}>
                    <span style={s.notifIcone}>
                      {n.tipo === 'REATIVACAO' ? '↺' : n.tipo === 'TRANSFERENCIA' ? '↔' : '📦'}
                    </span>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: 13, color: colors.textPrimary, fontFamily: fonts.body }}>{n.mensagem}</p>
                      <p style={{ margin: '3px 0 0', fontSize: 11, color: colors.textMuted, fontFamily: fonts.body }}>
                        {new Date(n.criado_em).toLocaleString('pt-BR')}
                      </p>
                    </div>
                    {!n.lida && <span style={s.notifDot} />}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Nova Entrega ────────────────────────────────────────────────────────────

function NovaEntregaForm({ campos, onPendenteCriado }: { campos: CampoImagemResponse[]; onPendenteCriado: () => void }) {
  const router = useRouter();
  const [chaveNfe, setChaveNfe] = useState('');
  const [imagens, setImagens] = useState<Record<string, File | null>>({});
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [estado, setEstado] = useState<EstadoEnvio>('idle');
  const [erro, setErro] = useState('');
  const [resetKey, setResetKey] = useState(0);

  useEffect(() => {
    const init: Record<string, File | null> = {};
    campos.forEach((c) => { init[c.key] = null; });
    setImagens(init);
  }, [campos]);

  function limpar() {
    contadorReset++;
    setChaveNfe('');
    const r: Record<string, File | null> = {};
    campos.forEach((c) => { r[c.key] = null; });
    setImagens(r);
    setLatitude(null); setLongitude(null);
    setEstado('idle'); setErro('');
    setResetKey(contadorReset);
  }

  const camposObrig = campos.filter((c) => c.obrigatorio);
  const podeEnviar = chaveNfe.length === 44 && camposObrig.every((c) => imagens[c.key]) && latitude !== null;
  const podeSalvarPendente = chaveNfe.length === 44;

  async function enviar(salvarPendente: boolean) {
    const token = getToken(); if (!token) { router.replace('/login'); return; }
    setEstado('enviando'); setErro('');
    try {
      const camposComImg = campos.filter((c) => imagens[c.key]);
      const uploads = await Promise.all(
        camposComImg.map((c) => uploadImagem(imagens[c.key]!, token).then((r) => ({ url_arquivo: r.url_arquivo, tipo: c.key }))),
      );
      await criarEntrega({
        chave_nfe: chaveNfe,
        latitude: latitude ?? 0,
        longitude: longitude ?? 0,
        imagens: uploads,
        status: salvarPendente ? 'PENDENTE' : 'ENVIADO',
      }, token);
      setEstado('sucesso');
      if (salvarPendente) onPendenteCriado();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro inesperado.');
      setEstado('erro');
    }
  }

  const pendentes = [
    chaveNfe.length !== 44 && 'Chave NF-e',
    ...camposObrig.filter((c) => !imagens[c.key]).map((c) => c.label),
    latitude === null && 'Localização',
  ].filter(Boolean) as string[];

  if (estado === 'sucesso') return (
    <div style={s.sucessoCard}>
      <div style={s.sucessoIcone}>✓</div>
      <p style={s.sucessoTitulo}>Entrega registrada!</p>
      <p style={s.sucessoDesc}>O comprovante está disponível para o gestor.</p>
      <button type="button" onClick={limpar} style={s.btnPrimario}>Registrar nova entrega</button>
    </div>
  );

  return (
    <div style={s.form}>
      <Secao numero={1} titulo="Chave NF-e">
        <LeitorNFe key={`nfe-${resetKey}`} onChaveCapturada={setChaveNfe} />
      </Secao>

      {campos.map((campo, idx) => (
        <Secao key={campo.key} numero={idx + 2} titulo={campo.label}>
          <CapturaImagem
            key={`${campo.key}-${resetKey}`}
            tipo={campo.key as any}
            label={campo.label}
            onImagemSelecionada={(file) => setImagens((prev) => ({ ...prev, [campo.key]: file }))}
          />
        </Secao>
      ))}

      <Secao numero={campos.length + 2} titulo="Localização">
        <GeolocalizacaoCaptura key={`geo-${resetKey}`} onCapturada={(lat, lng) => { setLatitude(lat); setLongitude(lng); }} />
      </Secao>

      {pendentes.length > 0 && (
        <div style={s.pendentesBox}>
          <p style={s.pendentesTitulo}>Pendente:</p>
          {pendentes.map((p) => <span key={p} style={s.pendenteItem}>{p}</span>)}
        </div>
      )}

      {estado === 'erro' && erro && (
        <div style={s.erroCard}>
          <p style={{ margin: 0, fontWeight: 600, fontFamily: fonts.body }}>Erro ao enviar</p>
          <p style={{ margin: '4px 0 0', fontSize: '14px', fontFamily: fonts.body }}>{erro}</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <button
          type="button"
          onClick={() => enviar(false)}
          disabled={!podeEnviar || estado === 'enviando'}
          style={!podeEnviar || estado === 'enviando' ? s.btnDisabled : s.btnPrimario}
        >
          {estado === 'enviando' ? <Spinner label="Enviando..." /> : 'Enviar Entrega'}
        </button>

        <button
          type="button"
          onClick={() => enviar(true)}
          disabled={!podeSalvarPendente || estado === 'enviando'}
          style={!podeSalvarPendente || estado === 'enviando' ? s.btnSecDisabled : s.btnSecundario}
        >
          Salvar como Pendente
        </button>
      </div>
    </div>
  );
}

// ─── Lista de Pendentes ───────────────────────────────────────────────────────

function PendentesLista({
  pendentes, carregando, campos, onFinalizado,
}: {
  pendentes: EntregaResponse[];
  carregando: boolean;
  campos: CampoImagemResponse[];
  onFinalizado: () => void;
}) {
  const [selecionada, setSelecionada] = useState<EntregaResponse | null>(null);
  const [excluindo, setExcluindo] = useState<string | null>(null);
  const [transferindo, setTransferindo] = useState<EntregaResponse | null>(null);
  const [recebidas, setRecebidas] = useState<TransferenciaResponse[]>([]);
  const [enviadas, setEnviadas] = useState<TransferenciaResponse[]>([]);
  const [respondendo, setRespondendo] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken(); if (!token) return;
    listarTransferenciasRecebidas(token).then(setRecebidas).catch(() => {});
    listarTransferenciasEnviadas(token).then(setEnviadas).catch(() => {});
  }, []);

  async function handleExcluir(e: EntregaResponse) {
    if (!confirm(`Excluir a entrega ${e.codigo ?? e.chave_nfe.slice(0, 10)}? Esta ação não pode ser desfeita.`)) return;
    const token = getToken(); if (!token) return;
    setExcluindo(e.id);
    try {
      await excluirEntregaPendente(e.id, token);
      onFinalizado();
    } finally {
      setExcluindo(null);
    }
  }

  async function handleResponder(id: string, acao: 'aceitar' | 'recusar') {
    const token = getToken(); if (!token) return;
    setRespondendo(id);
    try {
      await responderTransferencia(id, acao, token);
      setRecebidas((prev) => prev.filter((t) => t.id !== id));
      if (acao === 'aceitar') onFinalizado();
    } finally {
      setRespondendo(null);
    }
  }

  async function handleCancelarEnviada(id: string) {
    const token = getToken(); if (!token) return;
    await responderTransferencia(id, 'cancelar', token);
    setEnviadas((prev) => prev.filter((t) => t.id !== id));
    onFinalizado();
  }

  if (carregando) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '2rem 0' }}>
      <span style={s.spinner} />
      <span style={{ color: colors.textSecondary, fontFamily: fonts.body }}>Carregando…</span>
    </div>
  );

  if (selecionada) return (
    <FinalizarForm
      entrega={selecionada}
      campos={campos}
      onVoltar={() => setSelecionada(null)}
      onFinalizado={() => { setSelecionada(null); onFinalizado(); }}
    />
  );

  if (transferindo) return (
    <TransferirModal
      entrega={transferindo}
      onVoltar={() => setTransferindo(null)}
      onTransferido={() => { setTransferindo(null); onFinalizado(); listarTransferenciasEnviadas(getToken()!).then(setEnviadas).catch(() => {}); }}
    />
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Transferências recebidas */}
      {recebidas.length > 0 && (
        <div>
          <p style={s.secLabel}>📨 Transferências recebidas ({recebidas.length})</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {recebidas.map((t) => (
              <div key={t.id} style={s.transCard}>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: colors.textPrimary, fontFamily: fonts.body }}>
                    De: {t.remetente?.nome ?? '—'}
                  </p>
                  {t.entrega?.codigo && <span style={s.codigoBadge}>{t.entrega.codigo}</span>}
                  <p style={{ margin: '4px 0 0', fontSize: 11, fontFamily: 'monospace', color: colors.textMuted }}>
                    {t.entrega?.chave_nfe?.slice(0, 12)}…
                  </p>
                  {t.mensagem && (
                    <p style={{ margin: '6px 0 0', fontSize: 12, color: colors.textSecondary, fontFamily: fonts.body, fontStyle: 'italic' }}>
                      "{t.mensagem}"
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <button
                    onClick={() => handleResponder(t.id, 'aceitar')}
                    disabled={respondendo === t.id}
                    style={{ ...s.btnAceitar, opacity: respondendo === t.id ? 0.5 : 1 }}
                  >
                    Aceitar
                  </button>
                  <button
                    onClick={() => handleResponder(t.id, 'recusar')}
                    disabled={respondendo === t.id}
                    style={{ ...s.btnRecusar, opacity: respondendo === t.id ? 0.5 : 1 }}
                  >
                    Recusar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transferências enviadas aguardando */}
      {enviadas.length > 0 && (
        <div>
          <p style={s.secLabel}>📤 Aguardando resposta ({enviadas.length})</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {enviadas.map((t) => (
              <div key={t.id} style={{ ...s.transCard, opacity: 0.75 }}>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 13, color: colors.textSecondary, fontFamily: fonts.body }}>
                    Para: <span style={{ fontWeight: 600, color: colors.textPrimary }}>{t.destinatario?.nome ?? '—'}</span>
                  </p>
                  {t.entrega?.codigo && <span style={s.codigoBadge}>{t.entrega.codigo}</span>}
                </div>
                <button onClick={() => handleCancelarEnviada(t.id)} style={s.btnRecusar}>Cancelar</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Minhas pendentes */}
      {pendentes.length === 0 && recebidas.length === 0 ? (
        <div style={s.vazio}>
          <span style={{ fontSize: '2rem' }}>✅</span>
          <p style={{ color: colors.textSecondary, fontFamily: fonts.body, margin: 0 }}>Nenhuma entrega pendente.</p>
        </div>
      ) : pendentes.length > 0 && (
        <div>
          <p style={s.secLabel}>📦 Minhas pendentes ({pendentes.length})</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {pendentes.map((e) => {
              const emTransferencia = enviadas.some((t) => t.entrega_id === e.id);
              return (
                <div key={e.id} style={s.pendenteCard}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      {e.codigo && <span style={s.codigoBadge}>{e.codigo}</span>}
                      {emTransferencia && <span style={s.tagTransf}>aguardando resposta</span>}
                      <span style={{ fontSize: 12, color: colors.textMuted, fontFamily: 'monospace' }}>
                        {e.chave_nfe.slice(0, 10)}…{e.chave_nfe.slice(-6)}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: 12, color: colors.textSecondary, fontFamily: fonts.body }}>
                      {new Date(e.data_hora).toLocaleString('pt-BR')}
                    </p>
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: colors.textMuted, fontFamily: fonts.body }}>
                      {e.imagens.length} foto{e.imagens.length !== 1 ? 's' : ''} já enviada{e.imagens.length !== 1 ? 's' : ''}
                    </p>
                    {e.comentario_reativacao && (
                      <p style={{ margin: '6px 0 0', fontSize: 12, color: colors.warning, fontFamily: fonts.body, fontStyle: 'italic', borderLeft: `2px solid ${colors.warning}`, paddingLeft: 6 }}>
                        "{e.comentario_reativacao}"
                      </p>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <button onClick={() => setSelecionada(e)} style={s.btnRetomar} disabled={emTransferencia}>Retomar →</button>
                    <button onClick={() => setTransferindo(e)} style={s.btnTransferir} disabled={emTransferencia}>Transferir</button>
                    <button
                      onClick={() => handleExcluir(e)}
                      disabled={excluindo === e.id || emTransferencia}
                      style={{ ...s.btnExcluirPendente, opacity: excluindo === e.id || emTransferencia ? 0.5 : 1 }}
                    >
                      {excluindo === e.id ? '…' : 'Excluir'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Modal de Transferência ───────────────────────────────────────────────────

function TransferirModal({
  entrega, onVoltar, onTransferido,
}: {
  entrega: EntregaResponse;
  onVoltar: () => void;
  onTransferido: () => void;
}) {
  const [colegas, setColegas] = useState<{ id: string; nome: string }[]>([]);
  const [destinatarioId, setDestinatarioId] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    const token = getToken(); if (!token) return;
    listarColegas(token).then(setColegas).catch(() => {});
  }, []);

  async function handleEnviar() {
    if (!destinatarioId) { setErro('Selecione um entregador'); return; }
    const token = getToken(); if (!token) return;
    setEnviando(true); setErro('');
    try {
      await solicitarTransferencia(entrega.id, destinatarioId, mensagem || undefined, token);
      onTransferido();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao transferir');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div style={s.form}>
      <button onClick={onVoltar} style={s.btnVoltar}>← Voltar</button>

      <div style={s.infoCard}>
        <p style={{ margin: 0, fontSize: 12, color: colors.textMuted, fontFamily: fonts.body }}>Transferindo entrega</p>
        {entrega.codigo && <span style={s.codigoBadge}>{entrega.codigo}</span>}
        <p style={{ margin: '4px 0 0', fontSize: 11, fontFamily: 'monospace', color: colors.textMuted, wordBreak: 'break-all' }}>{entrega.chave_nfe}</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label style={s.fieldLabel}>Entregador destinatário</label>
        {colegas.length === 0 ? (
          <p style={{ fontSize: 13, color: colors.textMuted, fontFamily: fonts.body }}>Nenhum colega disponível na sua empresa.</p>
        ) : (
          <select
            value={destinatarioId}
            onChange={(e) => setDestinatarioId(e.target.value)}
            style={s.select}
          >
            <option value="">Selecione…</option>
            {colegas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label style={s.fieldLabel}>Mensagem (opcional)</label>
        <textarea
          value={mensagem}
          onChange={(e) => setMensagem(e.target.value)}
          placeholder="Ex: Cliente não estava em casa, tentar novamente amanhã…"
          rows={3}
          style={s.textarea}
        />
      </div>

      {erro && <p style={{ color: colors.error, fontSize: 13, fontFamily: fonts.body, margin: 0 }}>{erro}</p>}

      <button
        onClick={handleEnviar}
        disabled={!destinatarioId || enviando}
        style={!destinatarioId || enviando ? s.btnDisabled : s.btnPrimario}
      >
        {enviando ? <Spinner label="Enviando…" /> : 'Enviar Transferência'}
      </button>
    </div>
  );
}

// ─── Finalizar Entrega Pendente ───────────────────────────────────────────────

function FinalizarForm({
  entrega, campos, onVoltar, onFinalizado,
}: {
  entrega: EntregaResponse;
  campos: CampoImagemResponse[];
  onVoltar: () => void;
  onFinalizado: () => void;
}) {
  const router = useRouter();
  const jaEnviadas = new Set<string>(entrega.imagens.map((i) => i.campo_key ?? i.tipo ?? '').filter(Boolean));
  const camposFaltando = campos.filter((c) => !jaEnviadas.has(c.key));

  // Localização já existe se lat/lng não são zero
  const temLocalizacao = Number(entrega.latitude) !== 0 || Number(entrega.longitude) !== 0;

  const [imagens, setImagens] = useState<Record<string, File | null>>(() => {
    const r: Record<string, File | null> = {};
    camposFaltando.forEach((c) => { r[c.key] = null; });
    return r;
  });
  const [latitude, setLatitude] = useState<number | null>(temLocalizacao ? Number(entrega.latitude) : null);
  const [longitude, setLongitude] = useState<number | null>(temLocalizacao ? Number(entrega.longitude) : null);
  const [atualizarLoc, setAtualizarLoc] = useState(!temLocalizacao);
  const [estado, setEstado] = useState<EstadoEnvio>('idle');
  const [erro, setErro] = useState('');
  const [resetKey] = useState(0);

  const camposObrigFaltando = camposFaltando.filter((c) => c.obrigatorio);
  const locOk = latitude !== null && longitude !== null;
  const podeFinalizar = camposObrigFaltando.every((c) => imagens[c.key]) && locOk;

  async function handleFinalizar() {
    const token = getToken(); if (!token) { router.replace('/login'); return; }
    setEstado('enviando'); setErro('');
    try {
      const camposComImg = camposFaltando.filter((c) => imagens[c.key]);
      const uploads = await Promise.all(
        camposComImg.map((c) => uploadImagem(imagens[c.key]!, token).then((r) => ({ url_arquivo: r.url_arquivo, tipo: c.key }))),
      );
      await finalizarEntrega(entrega.id, { imagens: uploads, latitude: latitude!, longitude: longitude! }, token);
      setEstado('sucesso');
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao finalizar.');
      setEstado('erro');
    }
  }

  if (estado === 'sucesso') return (
    <div style={s.sucessoCard}>
      <div style={s.sucessoIcone}>✓</div>
      <p style={s.sucessoTitulo}>Entrega finalizada!</p>
      <p style={s.sucessoDesc}>Comprovante enviado com sucesso.</p>
      <button type="button" onClick={onFinalizado} style={s.btnPrimario}>Voltar às pendentes</button>
    </div>
  );

  return (
    <div style={s.form}>
      <button onClick={onVoltar} style={s.btnVoltar}>← Voltar</button>

      <div style={s.infoCard}>
        <p style={{ margin: 0, fontSize: '12px', color: colors.textMuted, fontFamily: fonts.body }}>Finalizando entrega</p>
        {entrega.codigo && <span style={s.codigoBadge}>{entrega.codigo}</span>}
        <p style={{ margin: '4px 0 0', fontSize: '11px', fontFamily: 'monospace', color: colors.textMuted, wordBreak: 'break-all' }}>{entrega.chave_nfe}</p>
      </div>

      {entrega.imagens.length > 0 && (
        <div>
          <p style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: 600, color: colors.textSecondary, fontFamily: fonts.body }}>
            Já enviadas ({entrega.imagens.length})
          </p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {entrega.imagens.map((img) => (
              <div key={img.id} style={s.imgThumb}>
                <img src={img.url_arquivo} alt={img.tipo ?? img.campo_key ?? ''} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: radius.sm }} />
                <span style={s.imgLabel}>{img.campo_key ?? img.tipo ?? '—'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {camposFaltando.length === 0 ? (
        <p style={{ fontSize: '14px', color: colors.textSecondary, fontFamily: fonts.body }}>
          Todas as fotos já foram enviadas. Confirme a localização para finalizar.
        </p>
      ) : (
        camposFaltando.map((campo, idx) => (
          <Secao key={campo.key} numero={idx + 1} titulo={`${campo.label}${campo.obrigatorio ? '' : ' (opcional)'}`}>
            <CapturaImagem
              key={`fin-${campo.key}-${resetKey}`}
              tipo={campo.key as any}
              label={campo.label}
              onImagemSelecionada={(file) => setImagens((prev) => ({ ...prev, [campo.key]: file }))}
            />
          </Secao>
        ))
      )}

      <Secao numero={camposFaltando.length + 1} titulo="Localização">
        {temLocalizacao && !atualizarLoc ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ padding: '10px 12px', backgroundColor: colors.successBg, border: `1px solid ${colors.successBorder}`, borderRadius: radius.md }}>
              <p style={{ margin: 0, fontSize: 13, color: colors.success, fontFamily: fonts.body, fontWeight: 600 }}>✓ Localização já registrada</p>
              <p style={{ margin: '3px 0 0', fontSize: 11, fontFamily: 'monospace', color: colors.textMuted }}>
                {Number(entrega.latitude).toFixed(6)} / {Number(entrega.longitude).toFixed(6)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => { setAtualizarLoc(true); setLatitude(null); setLongitude(null); }}
              style={{ background: 'none', border: 'none', color: colors.textMuted, fontSize: 12, cursor: 'pointer', textAlign: 'left', padding: 0, fontFamily: fonts.body }}
            >
              Atualizar localização
            </button>
          </div>
        ) : (
          <GeolocalizacaoCaptura
            key={`geo-fin-${resetKey}`}
            onCapturada={(lat, lng) => { setLatitude(lat); setLongitude(lng); }}
          />
        )}
      </Secao>

      {estado === 'erro' && erro && (
        <div style={s.erroCard}>
          <p style={{ margin: 0, fontWeight: 600, fontFamily: fonts.body }}>Erro</p>
          <p style={{ margin: '4px 0 0', fontSize: '14px', fontFamily: fonts.body }}>{erro}</p>
        </div>
      )}

      <button
        type="button"
        onClick={handleFinalizar}
        disabled={!podeFinalizar || estado === 'enviando'}
        style={!podeFinalizar || estado === 'enviando' ? s.btnDisabled : s.btnPrimario}
      >
        {estado === 'enviando' ? <Spinner label="Finalizando..." /> : 'Finalizar Entrega'}
      </button>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function Secao({ numero, titulo, children }: { numero: number; titulo: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{
          width: 24, height: 24, borderRadius: '50%',
          backgroundColor: colors.accentLight, border: `1px solid ${colors.accentBorder}`,
          color: colors.accent, fontSize: 12, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: fonts.title, flexShrink: 0,
        }}>{numero}</span>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: colors.textPrimary, margin: 0, fontFamily: fonts.title }}>{titulo}</h2>
      </div>
      <div style={{ paddingLeft: 34 }}>{children}</div>
    </div>
  );
}

function Spinner({ label }: { label: string }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
      <span style={s.spinner} /> {label}
    </span>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { maxWidth: 480, margin: '0 auto', minHeight: '100dvh', backgroundColor: colors.bgPrimary, display: 'flex', flexDirection: 'column' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', backgroundColor: colors.bgCard, borderBottom: `1px solid ${colors.border}`, position: 'sticky', top: 0, zIndex: 10 },
  headerRight: { display: 'flex', alignItems: 'center', gap: 10 },
  headerNome: { fontSize: 13, color: colors.textSecondary, fontFamily: fonts.body },
  btnSair: { padding: '6px 12px', fontSize: 13, borderRadius: radius.md, border: `1px solid ${colors.border}`, backgroundColor: 'transparent', color: colors.textSecondary, cursor: 'pointer', fontFamily: fonts.body },
  btnNotifLista: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', backgroundColor: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: radius.md, fontSize: 13, color: colors.textSecondary, cursor: 'pointer', fontFamily: fonts.body, width: '100%', justifyContent: 'flex-start' },
  notifOverlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 200 },
  notifItem: { display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 10px', backgroundColor: colors.bgSecondary, borderRadius: radius.md, border: `1px solid ${colors.border}` },
  notifIcone: { fontSize: 16, flexShrink: 0, marginTop: 1 },
  notifDot: { width: 7, height: 7, borderRadius: '50%', backgroundColor: colors.accent, flexShrink: 0, marginTop: 4 },
  abas: { display: 'flex', borderBottom: `1px solid ${colors.border}`, backgroundColor: colors.bgCard },
  aba: { flex: 1, padding: '12px 8px', fontSize: 14, fontWeight: 500, borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderBottom: '2px solid transparent', backgroundColor: 'transparent', color: colors.textSecondary, cursor: 'pointer', fontFamily: fonts.body, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 },
  abaAtiva: { color: colors.accent, borderBottom: `2px solid ${colors.accent}`, fontWeight: 700 },
  badge: { backgroundColor: colors.accent, color: '#fff', borderRadius: 9999, fontSize: 11, fontWeight: 700, padding: '1px 7px', fontFamily: fonts.body },
  body: { padding: '20px 16px', flex: 1 },
  form: { display: 'flex', flexDirection: 'column', gap: 28, paddingBottom: 32 },
  sucessoCard: { backgroundColor: colors.bgCard, border: `1px solid ${colors.successBorder}`, borderRadius: radius.xl, padding: '2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 },
  sucessoIcone: { width: 56, height: 56, borderRadius: '50%', backgroundColor: colors.successBg, border: `2px solid ${colors.success}`, color: colors.success, fontSize: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 },
  sucessoTitulo: { fontSize: 18, fontWeight: 700, color: colors.textPrimary, margin: 0, fontFamily: fonts.title },
  sucessoDesc: { fontSize: 14, color: colors.textSecondary, margin: 0, fontFamily: fonts.body },
  pendentesBox: { display: 'flex', flexWrap: 'wrap', gap: 6, padding: 12, backgroundColor: colors.bgCard, borderRadius: radius.md, border: `1px solid ${colors.border}`, alignItems: 'center' },
  pendentesTitulo: { fontSize: 12, color: colors.textMuted, fontFamily: fonts.body, margin: 0, marginRight: 4 },
  pendenteItem: { fontSize: 12, color: colors.warning, backgroundColor: colors.warningBg, border: `1px solid ${colors.warningBorder}`, borderRadius: radius.full, padding: '2px 10px', fontFamily: fonts.body },
  erroCard: { padding: 12, borderRadius: radius.md, backgroundColor: colors.errorBg, border: `1px solid ${colors.errorBorder}`, color: colors.error },
  btnPrimario: { padding: '14px 16px', fontSize: 16, fontWeight: 600, borderRadius: radius.md, border: 'none', backgroundColor: colors.accent, color: '#fff', cursor: 'pointer', width: '100%', fontFamily: fonts.title },
  btnDisabled: { padding: '14px 16px', fontSize: 16, fontWeight: 600, borderRadius: radius.md, border: 'none', backgroundColor: colors.textMuted, color: 'rgba(255,255,255,0.4)', cursor: 'not-allowed', width: '100%', fontFamily: fonts.title },
  btnSecundario: { padding: '12px 16px', fontSize: 14, fontWeight: 500, borderRadius: radius.md, border: `1px solid ${colors.border}`, backgroundColor: 'transparent', color: colors.textSecondary, cursor: 'pointer', width: '100%', fontFamily: fonts.body },
  btnSecDisabled: { padding: '12px 16px', fontSize: 14, fontWeight: 500, borderRadius: radius.md, border: `1px solid ${colors.border}`, backgroundColor: 'transparent', color: colors.textMuted, cursor: 'not-allowed', width: '100%', fontFamily: fonts.body },
  btnVoltar: { background: 'transparent', border: 'none', color: colors.accent, fontSize: 14, cursor: 'pointer', padding: 0, fontFamily: fonts.body, textAlign: 'left', marginBottom: 4 },
  pendenteCard: { backgroundColor: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 },
  btnRetomar: { padding: '8px 14px', backgroundColor: colors.accentLight, color: colors.accent, border: `1px solid ${colors.accentBorder}`, borderRadius: radius.md, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: fonts.body, whiteSpace: 'nowrap' },
  btnTransferir: { padding: '6px 14px', backgroundColor: colors.warningBg, color: colors.warning, border: `1px solid ${colors.warningBorder}`, borderRadius: radius.md, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: fonts.body, whiteSpace: 'nowrap' },
  btnExcluirPendente: { padding: '6px 14px', backgroundColor: colors.errorBg, color: colors.error, border: `1px solid ${colors.errorBorder}`, borderRadius: radius.md, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: fonts.body, whiteSpace: 'nowrap' },
  btnAceitar: { padding: '7px 14px', backgroundColor: colors.successBg, color: colors.success, border: `1px solid ${colors.successBorder}`, borderRadius: radius.md, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: fonts.body, whiteSpace: 'nowrap' },
  btnRecusar: { padding: '6px 14px', backgroundColor: colors.errorBg, color: colors.error, border: `1px solid ${colors.errorBorder}`, borderRadius: radius.md, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: fonts.body, whiteSpace: 'nowrap' },
  transCard: { backgroundColor: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 },
  secLabel: { margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: colors.textSecondary, fontFamily: fonts.body, textTransform: 'uppercase', letterSpacing: '0.06em' },
  tagTransf: { fontSize: 10, backgroundColor: colors.warningBg, color: colors.warning, border: `1px solid ${colors.warningBorder}`, borderRadius: 9999, padding: '1px 7px', fontFamily: fonts.body },
  fieldLabel: { fontSize: 12, color: colors.textMuted, fontFamily: fonts.body, textTransform: 'uppercase', letterSpacing: '0.04em' },
  select: { padding: '0.5rem 0.75rem', border: `1px solid ${colors.border}`, borderRadius: radius.sm, fontSize: 14, backgroundColor: colors.bgSecondary, color: colors.textPrimary, fontFamily: fonts.body, outline: 'none' },
  textarea: { padding: '0.5rem 0.75rem', border: `1px solid ${colors.border}`, borderRadius: radius.sm, fontSize: 13, backgroundColor: colors.bgSecondary, color: colors.textPrimary, fontFamily: fonts.body, outline: 'none', resize: 'vertical' as const },  codigoBadge: { display: 'inline-block', fontFamily: 'monospace', fontWeight: 700, fontSize: 13, color: colors.accent, backgroundColor: colors.accentLight, border: `1px solid ${colors.accentBorder}`, borderRadius: radius.sm, padding: '1px 8px', letterSpacing: '0.08em' },
  infoCard: { backgroundColor: colors.bgSecondary, border: `1px solid ${colors.border}`, borderRadius: radius.md, padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 4 },
  imgThumb: { position: 'relative', width: 72, height: 72, borderRadius: radius.md, overflow: 'hidden', border: `1px solid ${colors.border}` },
  imgLabel: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: 9, textAlign: 'center', padding: '2px 0', fontFamily: fonts.body },
  vazio: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '3rem 0', textAlign: 'center' },
  spinner: { display: 'inline-block', width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
};
