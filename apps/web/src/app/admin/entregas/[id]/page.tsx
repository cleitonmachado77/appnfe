'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getToken, buscarEntrega, reprocessarDanfe, reativarEntrega, excluirImagemEntrega, limparCamposEntrega, conferirEntrega, listarCamposImagem, type EntregaResponse, type CampoImagemResponse } from '@/lib/api';
import { colors, fonts, radius } from '@/lib/brand';

export default function DetalheEntregaPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const [entrega, setEntrega] = useState<EntregaResponse | null>(null);
  const [camposImagem, setCamposImagem] = useState<CampoImagemResponse[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [imagemAmpliada, setImagemAmpliada] = useState<string | null>(null);
  const [reprocessando, setReprocessando] = useState(false);
  const [reativando, setReativando] = useState(false);
  const [modalReativar, setModalReativar] = useState(false);
  const [comentarioReativar, setComentarioReativar] = useState('');
  const [excluindoImagem, setExcluindoImagem] = useState<string | null>(null);
  // rastreia o que foi excluído para liberar o botão Reativar
  const [camposLimpos, setCamposLimpos] = useState<{ chave_nfe: boolean; localizacao: boolean; imagem: boolean }>({
    chave_nfe: false, localizacao: false, imagem: false,
  });
  const [limpando, setLimpando] = useState<string | null>(null);
  const [conferindo, setConferindo] = useState(false);
  const [camposImagemCarregados, setCamposImagemCarregados] = useState(false);

  async function handleConferir() {
    const token = getToken(); if (!token) return;
    setConferindo(true);
    try {
      const novoValor = !entrega?.conferida;
      await conferirEntrega(id, novoValor, token);
      setEntrega((prev) => prev ? { ...prev, conferida: novoValor, conferida_em: novoValor ? new Date().toISOString() : null } : prev);
    } finally { setConferindo(false); }
  }

  // Detecta campos já vazios no servidor (ex: após reload) além dos limpos na sessão
  const chaveVazia = !entrega?.chave_nfe?.trim();
  // Verifica se latitude/longitude são 0, null, undefined ou string vazia
  // parseFloat lida com strings e números, retorna NaN para valores inválidos
  const lat = parseFloat(String(entrega?.latitude ?? ''));
  const lng = parseFloat(String(entrega?.longitude ?? ''));
  const localizacaoVazia = (isNaN(lat) || lat === 0) && (isNaN(lng) || lng === 0);
  const imagensObrigatorias = camposImagem.filter((c) => c.ativo && c.obrigatorio);
  const imagensPresentes = new Set((entrega?.imagens ?? []).map((i) => i.campo_key ?? i.tipo ?? '').filter(Boolean));
  // Só considera falta de imagem se camposImagem já foi carregado
  const faltaImagemObrigatoria = camposImagemCarregados && imagensObrigatorias.some((c) => !imagensPresentes.has(c.key));
  const faltaImagem = faltaImagemObrigatoria || camposLimpos.imagem;

  const podeReativar = entrega?.status !== 'PENDENTE' &&
    (camposLimpos.chave_nfe || camposLimpos.localizacao || faltaImagem || chaveVazia || localizacaoVazia);

  async function handleLimparCampo(campo: 'chave_nfe' | 'localizacao') {
    if (!confirm(`Limpar ${campo === 'chave_nfe' ? 'a Chave NF-e' : 'a localização'}? O entregador precisará preencher novamente.`)) return;
    const token = getToken(); if (!token) return;
    setLimpando(campo);
    try {
      await limparCamposEntrega(id, { [campo]: true }, token);
      if (campo === 'chave_nfe') {
        setEntrega((prev) => prev ? { ...prev, chave_nfe: '' } : prev);
      } else {
        setEntrega((prev) => prev ? { ...prev, latitude: 0, longitude: 0 } : prev);
      }
      setCamposLimpos((prev) => ({ ...prev, [campo]: true }));
    } finally {
      setLimpando(null);
    }
  }

  async function handleExcluirImagem(imagemId: string) {
    if (!confirm('Excluir esta imagem? Esta ação não pode ser desfeita.')) return;
    const token = getToken(); if (!token) return;
    setExcluindoImagem(imagemId);
    try {
      await excluirImagemEntrega(imagemId, token);
      setEntrega((prev) => prev ? { ...prev, imagens: prev.imagens.filter((i) => i.id !== imagemId) } : prev);
      setCamposLimpos((prev) => ({ ...prev, imagem: true }));
    } finally {
      setExcluindoImagem(null);
    }
  }

  useEffect(() => {
    const token = getToken();
    if (!token) { router.replace('/login'); return; }
    buscarEntrega(id, token)
      .then(setEntrega)
      .catch((e) => setErro(e instanceof Error ? e.message : 'Erro ao carregar entrega'))
      .finally(() => setCarregando(false));
    listarCamposImagem(token)
      .then(setCamposImagem)
      .catch(() => {})
      .finally(() => setCamposImagemCarregados(true));
  }, [id, router]);

  if (carregando) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '2rem' }}>
      <span style={{ display: 'inline-block', width: '18px', height: '18px', border: `2px solid ${colors.border}`, borderTopColor: colors.accent, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <span style={{ color: colors.textSecondary, fontFamily: fonts.body }}>Carregando…</span>
    </div>
  );
  if (erro) return <p style={{ color: colors.error, fontFamily: fonts.body }}>{erro}</p>;
  if (!entrega) return null;

  const canhoto = entrega.imagens.find((i) => (i.campo_key ?? i.tipo) === 'CANHOTO');
  const local = entrega.imagens.find((i) => (i.campo_key ?? i.tipo) === 'LOCAL');

  async function handleReprocessarDanfe() {
    const token = getToken();
    if (!token) return;
    setReprocessando(true);
    try {
      const result = await reprocessarDanfe(id, token);
      setEntrega((prev) => prev ? { ...prev, danfe_pdf_base64: result.danfe_pdf_base64 } : prev);
    } catch {
      // silencia erro, usuário pode tentar novamente
    } finally {
      setReprocessando(false);
    }
  }

  async function handleReativar() {
    const token = getToken(); if (!token) return;
    setReativando(true);
    try {
      await reativarEntrega(id, comentarioReativar || undefined, token);
      setEntrega((prev) => prev ? { ...prev, status: 'PENDENTE' } : prev);
      setModalReativar(false);
      setComentarioReativar('');
    } finally {
      setReativando(false);
    }
  }

  return (
    <div>
      <div style={s.cabecalho}>
        <button onClick={() => router.back()} style={s.btnVoltar}>← Voltar</button>
        <h1 style={s.titulo}>Detalhe da Entrega</h1>
      </div>

      <div style={s.card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <h2 style={{ ...s.secaoTitulo, margin: 0 }}>Informações</h2>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              onClick={handleConferir}
              disabled={conferindo || entrega.status === 'PENDENTE'}
              style={{
                padding: '0.375rem 0.875rem',
                backgroundColor: entrega.conferida ? colors.successBg : colors.bgSecondary,
                color: entrega.conferida ? colors.success : colors.textSecondary,
                border: `1px solid ${entrega.conferida ? colors.successBorder : colors.border}`,
                borderRadius: radius.md, fontSize: '0.8rem', fontWeight: 600,
                cursor: entrega.status === 'PENDENTE' ? 'not-allowed' : 'pointer',
                opacity: conferindo ? 0.6 : 1, fontFamily: fonts.body,
              }}
              title={entrega.status === 'PENDENTE' ? 'Não é possível conferir uma entrega pendente' : ''}
            >
              {entrega.conferida ? '✓ Conferida' : '○ Conferir'}
            </button>
            {podeReativar && (
              <button onClick={() => setModalReativar(true)} style={s.btnReativar}>
                ↺ Reativar entrega
              </button>
            )}
          </div>
        </div>

        {entrega.comentario_reativacao && entrega.status === 'PENDENTE' && (
          <div style={{ backgroundColor: colors.warningBg, border: `1px solid ${colors.warningBorder}`, borderRadius: radius.md, padding: '0.75rem 1rem', marginBottom: '1.25rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '1rem', flexShrink: 0 }}>↺</span>
            <div>
              <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 600, color: colors.warning, fontFamily: fonts.body }}>
                Entrega reativada — aguardando conclusão pelo entregador
              </p>
              <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: colors.textMuted, fontFamily: fonts.body, fontStyle: 'italic' }}>
                {entrega.comentario_reativacao}
              </p>
            </div>
          </div>
        )}
        <div style={s.grid}>
          <Campo label="Código" valor={entrega.codigo ?? '—'} mono />
          <CampoExcluivel
            label="Chave NF-e"
            valor={entrega.chave_nfe?.trim() || '—'}
            mono
            excluido={camposLimpos.chave_nfe}
            excluindo={limpando === 'chave_nfe'}
            onExcluir={() => handleLimparCampo('chave_nfe')}
            podeExcluir={entrega.status !== 'PENDENTE' && !!entrega.chave_nfe?.trim() && !camposLimpos.chave_nfe}
          />
          <Campo label="Entregador" valor={entrega.entregador_nome} />
          <Campo label="Data/Hora" valor={new Date(entrega.data_hora).toLocaleString('pt-BR', { dateStyle: 'full', timeStyle: 'medium' })} />
          <Campo label="Status" valor={entrega.status} />
          {entrega.conferida && entrega.conferida_em && (
            <Campo label="Conferida em" valor={new Date(entrega.conferida_em).toLocaleString('pt-BR')} />
          )}
          <CampoExcluivel
            label="Latitude"
            valor={Number(entrega.latitude).toFixed(6)}
            mono
            excluido={camposLimpos.localizacao}
            excluindo={limpando === 'localizacao'}
            onExcluir={() => handleLimparCampo('localizacao')}
            podeExcluir={entrega.status !== 'PENDENTE' && !camposLimpos.localizacao}
          />
          <Campo label="Longitude" valor={Number(entrega.longitude).toFixed(6)} mono />
        </div>
      </div>

      {entrega.parcial && (() => {
        const imagensPresentes = new Set(entrega.imagens.map((i) => i.campo_key ?? i.tipo ?? '').filter(Boolean));
        const camposFaltantes = camposImagem.filter((c) => c.ativo && !imagensPresentes.has(c.key));
        const semLocalizacao = Number(entrega.latitude) === 0 && Number(entrega.longitude) === 0;
        return (
          <div style={{ backgroundColor: colors.warningBg, border: `1px solid ${colors.warningBorder}`, borderRadius: radius.lg, padding: '1.25rem', marginBottom: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>⚠️</span>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: colors.warning, fontFamily: fonts.title }}>
                Entrega Parcial
              </p>
              <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: colors.textSecondary, fontFamily: fonts.body }}>
                O entregador enviou esta entrega com informações ou imagens faltando.
              </p>
              {(camposFaltantes.length > 0 || semLocalizacao) && (
                <div style={{ marginTop: '0.75rem' }}>
                  <p style={{ margin: '0 0 6px', fontSize: '0.75rem', fontWeight: 600, color: colors.textMuted, fontFamily: fonts.body, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Campos faltantes:
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {camposFaltantes.map((c) => (
                      <span key={c.key} style={{ fontSize: '0.75rem', padding: '3px 10px', borderRadius: 9999, backgroundColor: 'transparent', border: `1px solid ${colors.warningBorder}`, color: colors.warning, fontFamily: fonts.body, fontWeight: 600 }}>
                        {c.label}{c.obrigatorio ? ' (obrigatório)' : ''}
                      </span>
                    ))}
                    {semLocalizacao && (
                      <span style={{ fontSize: '0.75rem', padding: '3px 10px', borderRadius: 9999, backgroundColor: 'transparent', border: `1px solid ${colors.warningBorder}`, color: colors.warning, fontFamily: fonts.body, fontWeight: 600 }}>
                        Localização (obrigatório)
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {entrega.dados_nfe && (
        <div style={s.card}>
          <h2 style={s.secaoTitulo}>Dados da Nota Fiscal</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <p style={s.subTitulo}>Emitente</p>
              <div style={s.grid}>
                <Campo label="Razão Social" valor={entrega.dados_nfe.emit_nome ?? '—'} />
                <Campo label="CNPJ" valor={entrega.dados_nfe.emit_cnpj ?? '—'} mono />
                <Campo label="UF" valor={entrega.dados_nfe.emit_uf ?? '—'} />
              </div>
            </div>
            <div>
              <p style={s.subTitulo}>Destinatário</p>
              <div style={s.grid}>
                <Campo label="Nome / Razão Social" valor={entrega.dados_nfe.dest_nome ?? '—'} />
                <Campo label="CNPJ / CPF" valor={entrega.dados_nfe.dest_cnpj_cpf ?? '—'} mono />
                <Campo label="Município" valor={entrega.dados_nfe.dest_municipio ?? '—'} />
                <Campo label="UF" valor={entrega.dados_nfe.dest_uf ?? '—'} />
              </div>
            </div>
            <div>
              <p style={s.subTitulo}>Nota</p>
              <div style={s.grid}>
                <Campo label="Número" valor={entrega.dados_nfe.numero_nfe ?? '—'} mono />
                <Campo label="Série" valor={entrega.dados_nfe.serie ?? '—'} />
                <Campo label="Data de Emissão" valor={entrega.dados_nfe.data_emissao ? new Date(entrega.dados_nfe.data_emissao).toLocaleString('pt-BR') : '—'} />
                <Campo label="Natureza da Operação" valor={entrega.dados_nfe.natureza_operacao ?? '—'} />
                <Campo label="Qtd. Itens" valor={entrega.dados_nfe.quantidade_itens != null ? String(entrega.dados_nfe.quantidade_itens) : '—'} />
              </div>
            </div>
            <div>
              <p style={s.subTitulo}>Valores</p>
              <div style={s.grid}>
                <Campo label="Total da NF-e" valor={entrega.dados_nfe.valor_total != null ? `R$ ${Number(entrega.dados_nfe.valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'} />
                <Campo label="Produtos" valor={entrega.dados_nfe.valor_produtos != null ? `R$ ${Number(entrega.dados_nfe.valor_produtos).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'} />
                <Campo label="Frete" valor={entrega.dados_nfe.valor_frete != null ? `R$ ${Number(entrega.dados_nfe.valor_frete).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'} />
                <Campo label="Desconto" valor={entrega.dados_nfe.valor_desconto != null ? `R$ ${Number(entrega.dados_nfe.valor_desconto).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'} />
              </div>
            </div>
            {(entrega.dados_nfe.transportadora_nome || entrega.dados_nfe.peso_bruto != null) && (
              <div>
                <p style={s.subTitulo}>Transporte</p>
                <div style={s.grid}>
                  {entrega.dados_nfe.transportadora_nome && <Campo label="Transportadora" valor={entrega.dados_nfe.transportadora_nome} />}
                  {entrega.dados_nfe.peso_bruto != null && <Campo label="Peso Bruto" valor={`${Number(entrega.dados_nfe.peso_bruto).toLocaleString('pt-BR')} kg`} />}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div style={s.card}>
        <h2 style={s.secaoTitulo}>Imagens</h2>
        {entrega.campos_ausentes && entrega.campos_ausentes.length > 0 && (
          <div style={{ padding: '10px 14px', backgroundColor: colors.warningBg, border: `1px solid ${colors.warningBorder}`, borderRadius: radius.md, marginBottom: '1rem', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <span style={{ fontSize: '1rem', flexShrink: 0 }}>⚠️</span>
            <div>
              <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 600, color: colors.warning, fontFamily: fonts.body }}>
                Campos declarados ausentes pelo entregador
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                {entrega.campos_ausentes.map((key) => (
                  <span key={key} style={{ fontSize: '0.75rem', color: colors.warning, backgroundColor: 'transparent', border: `1px solid ${colors.warningBorder}`, borderRadius: radius.full, padding: '2px 10px', fontFamily: fonts.body }}>
                    {key.charAt(0) + key.slice(1).toLowerCase().replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
        {entrega.imagens.length === 0 ? (
          <div style={s.semImagens}>
            <span style={{ fontSize: '2rem' }}>🖼️</span>
            <p style={{ color: colors.textSecondary, fontFamily: fonts.body }}>Nenhuma imagem associada.</p>
          </div>
        ) : (
          <div style={s.imagensGrid}>
            {entrega.imagens.map((img) => {
              const key = img.campo_key ?? img.tipo ?? '';
              const titulo = key.charAt(0) + key.slice(1).toLowerCase().replace(/_/g, ' ');
              return (
                <ImagemCard
                  key={img.id}
                  titulo={titulo}
                  url={img.url_arquivo}
                  excluindo={excluindoImagem === img.id}
                  onExcluir={() => handleExcluirImagem(img.id)}
                  onClick={() => setImagemAmpliada(img.url_arquivo)}
                />
              );
            })}
          </div>
        )}
      </div>

      <div style={s.card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <h2 style={{ ...s.secaoTitulo, margin: 0 }}>DANFE (Nota Fiscal)</h2>
          <button
            onClick={handleReprocessarDanfe}
            disabled={reprocessando}
            style={{ ...s.btnVoltar, opacity: reprocessando ? 0.6 : 1, cursor: reprocessando ? 'not-allowed' : 'pointer' }}
          >
            {reprocessando ? 'Buscando…' : '↻ Buscar DANFE'}
          </button>
        </div>
        {entrega.danfe_pdf_base64 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <a
              href={`data:application/pdf;base64,${entrega.danfe_pdf_base64}`}
              download={`DANFE-${entrega.chave_nfe}.pdf`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', backgroundColor: colors.accent, color: '#fff', borderRadius: radius.md, textDecoration: 'none', fontSize: '0.875rem', fontFamily: fonts.body, width: 'fit-content' }}
            >
              ⬇ Baixar PDF
            </a>
            <iframe
              src={`data:application/pdf;base64,${entrega.danfe_pdf_base64}`}
              style={{ width: '100%', height: '600px', border: `1px solid ${colors.border}`, borderRadius: radius.md }}
              title="DANFE PDF"
            />
          </div>
        ) : (
          <div style={s.semImagens}>
            <span style={{ fontSize: '2rem' }}>📄</span>
            <p style={{ color: colors.textSecondary, fontFamily: fonts.body, margin: 0 }}>
              DANFE ainda não disponível. Clique em "Buscar DANFE" para consultar.
            </p>
          </div>
        )}
      </div>

      {modalReativar && (
        <div style={s.overlay} onClick={() => !reativando && setModalReativar(false)}>
          <div style={{ ...s.overlayContent, backgroundColor: colors.bgCard, borderRadius: radius.xl, padding: '1.75rem', maxWidth: 440, width: '90vw', maxHeight: 'unset' }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ margin: '0 0 0.25rem', fontSize: '1.1rem', fontWeight: 700, color: colors.textPrimary, fontFamily: fonts.title }}>Reativar entrega</h2>
            <p style={{ margin: '0 0 1.25rem', fontSize: '0.875rem', color: colors.textSecondary, fontFamily: fonts.body }}>
              A entrega voltará para o entregador com status Pendente.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.75rem', color: colors.textMuted, fontFamily: fonts.body, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Comentário para o entregador (opcional)
              </label>
              <textarea
                value={comentarioReativar}
                onChange={(e) => setComentarioReativar(e.target.value)}
                placeholder="Ex: Assinatura do canhoto ilegível, refazer a entrega…"
                rows={3}
                style={{ padding: '0.5rem 0.75rem', border: `1px solid ${colors.border}`, borderRadius: radius.md, fontSize: '0.875rem', backgroundColor: colors.bgSecondary, color: colors.textPrimary, fontFamily: fonts.body, outline: 'none', resize: 'vertical' as const }}
                disabled={reativando}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={handleReativar}
                disabled={reativando}
                style={{ padding: '0.5rem 1.25rem', backgroundColor: colors.warning, color: '#fff', border: 'none', borderRadius: radius.md, fontSize: '0.875rem', fontWeight: 600, cursor: reativando ? 'not-allowed' : 'pointer', opacity: reativando ? 0.6 : 1, fontFamily: fonts.title }}
              >
                {reativando ? 'Reativando…' : 'Confirmar'}
              </button>
              <button onClick={() => setModalReativar(false)} disabled={reativando} style={s.btnVoltar}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {imagemAmpliada && (        <div style={s.overlay} onClick={() => setImagemAmpliada(null)}>
          <div style={s.overlayContent} onClick={(e) => e.stopPropagation()}>
            <button style={s.btnFechar} onClick={() => setImagemAmpliada(null)}>✕</button>
            <img src={imagemAmpliada} alt="Imagem ampliada" style={s.imagemAmpliada} />
            <button
              style={s.btnSalvarImg}
              onClick={async (e) => {
                e.stopPropagation();
                try {
                  const res = await fetch(imagemAmpliada);
                  const blob = await res.blob();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `imagem-entrega.${blob.type.split('/')[1] || 'jpg'}`;
                  a.click();
                  URL.revokeObjectURL(url);
                } catch {
                  window.open(imagemAmpliada, '_blank');
                }
              }}
            >
              ⬇ Salvar imagem
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Campo({ label, valor, mono }: { label: string; valor: string; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <span style={{ fontSize: '0.7rem', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: fonts.body }}>{label}</span>
      <span style={{ fontSize: '0.9rem', color: colors.textPrimary, fontFamily: mono ? 'monospace' : fonts.body, wordBreak: 'break-all' }}>{valor}</span>
    </div>
  );
}

function CampoExcluivel({ label, valor, mono, excluido, excluindo, onExcluir, podeExcluir }: {
  label: string; valor: string; mono?: boolean;
  excluido: boolean; excluindo: boolean; onExcluir: () => void; podeExcluir: boolean;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.7rem', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: fonts.body }}>{label}</span>
        {podeExcluir && (
          <button
            onClick={onExcluir}
            disabled={excluindo}
            style={{ background: 'none', border: 'none', cursor: excluindo ? 'not-allowed' : 'pointer', fontSize: '0.7rem', color: colors.error, opacity: excluindo ? 0.5 : 0.7, padding: '1px 4px', fontFamily: fonts.body }}
          >
            {excluindo ? '…' : '🗑 limpar'}
          </button>
        )}
      </div>
      <span style={{
        fontSize: '0.9rem',
        color: excluido ? colors.textMuted : colors.textPrimary,
        fontFamily: mono ? 'monospace' : fonts.body,
        wordBreak: 'break-all',
        textDecoration: excluido ? 'line-through' : 'none',
      }}>
        {excluido ? 'Removido' : valor}
      </span>
    </div>
  );
}

function ImagemCard({ titulo, url, onClick, onExcluir, excluindo }: {
  titulo: string; url: string; onClick: () => void;
  onExcluir: () => void; excluindo?: boolean;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: colors.textSecondary, fontFamily: fonts.body }}>{titulo}</span>
        <button
          onClick={onExcluir}
          disabled={excluindo}
          title="Excluir imagem"
          style={{ background: 'none', border: 'none', cursor: excluindo ? 'not-allowed' : 'pointer', fontSize: '0.75rem', color: colors.error, opacity: excluindo ? 0.5 : 0.7, padding: '2px 6px', fontFamily: fonts.body }}
        >
          {excluindo ? '…' : '🗑 excluir'}
        </button>
      </div>
      <img src={url} alt={titulo} onClick={onClick} style={{ width: '100%', maxHeight: '240px', objectFit: 'cover', borderRadius: radius.md, border: `1px solid ${colors.border}`, cursor: 'zoom-in' }} />
      <span style={{ fontSize: '0.75rem', color: colors.textMuted, fontFamily: fonts.body }}>Clique para ampliar</span>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  cabecalho: { display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' },
  titulo: { fontSize: '1.5rem', fontWeight: 700, color: colors.textPrimary, margin: 0, fontFamily: fonts.title },
  btnVoltar: { background: 'transparent', border: `1px solid ${colors.border}`, borderRadius: radius.md, padding: '0.375rem 0.875rem', fontSize: '0.875rem', cursor: 'pointer', color: colors.textSecondary, fontFamily: fonts.body },
  card: { backgroundColor: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: '1.5rem', marginBottom: '1rem' },
  secaoTitulo: { fontSize: '0.9rem', fontWeight: 700, color: colors.textSecondary, margin: '0 0 1.25rem', fontFamily: fonts.title, textTransform: 'uppercase', letterSpacing: '0.05em' },
  subTitulo: { fontSize: '0.75rem', fontWeight: 600, color: colors.textMuted, margin: '0 0 0.75rem', fontFamily: fonts.body, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: `1px solid ${colors.border}`, paddingBottom: '0.375rem' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.25rem' },
  imagensGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.25rem' },
  semImagens: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', padding: '2rem', backgroundColor: colors.bgSecondary, borderRadius: radius.md, border: `1px dashed ${colors.border}` },
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  overlayContent: { position: 'relative', maxWidth: '90vw', maxHeight: '90vh' },
  btnFechar: { position: 'absolute', top: '-2rem', right: 0, background: 'none', border: 'none', color: '#fff', fontSize: '1.25rem', cursor: 'pointer', padding: '0.25rem 0.5rem' },
  imagemAmpliada: { maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: radius.md },
  btnSalvarImg: { display: 'block', marginTop: '0.75rem', textAlign: 'center', fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', fontFamily: fonts.body, padding: '0.375rem 0.75rem', border: '1px solid rgba(255,255,255,0.2)', borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.05)', cursor: 'pointer', width: '100%' },
  btnReativar: { padding: '0.375rem 0.875rem', backgroundColor: colors.warningBg, color: colors.warning, border: `1px solid ${colors.warningBorder}`, borderRadius: radius.md, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: fonts.body },
};
