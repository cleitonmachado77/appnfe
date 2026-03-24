'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getToken, buscarEntrega, reprocessarDanfe, type EntregaResponse } from '@/lib/api';
import { colors, fonts, radius } from '@/lib/brand';

export default function DetalheEntregaPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const [entrega, setEntrega] = useState<EntregaResponse | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [imagemAmpliada, setImagemAmpliada] = useState<string | null>(null);
  const [reprocessando, setReprocessando] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) { router.replace('/login'); return; }
    buscarEntrega(id, token)
      .then(setEntrega)
      .catch((e) => setErro(e instanceof Error ? e.message : 'Erro ao carregar entrega'))
      .finally(() => setCarregando(false));
  }, [id, router]);

  if (carregando) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '2rem' }}>
      <span style={{ display: 'inline-block', width: '18px', height: '18px', border: `2px solid ${colors.border}`, borderTopColor: colors.accent, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <span style={{ color: colors.textSecondary, fontFamily: fonts.body }}>Carregando…</span>
    </div>
  );
  if (erro) return <p style={{ color: colors.error, fontFamily: fonts.body }}>{erro}</p>;
  if (!entrega) return null;

  const canhoto = entrega.imagens.find((i) => i.tipo === 'CANHOTO');
  const local = entrega.imagens.find((i) => i.tipo === 'LOCAL');

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

  return (
    <div>
      <div style={s.cabecalho}>
        <button onClick={() => router.back()} style={s.btnVoltar}>← Voltar</button>
        <h1 style={s.titulo}>Detalhe da Entrega</h1>
      </div>

      <div style={s.card}>
        <h2 style={s.secaoTitulo}>Informações</h2>
        <div style={s.grid}>
          <Campo label="Chave NF-e" valor={entrega.chave_nfe} mono />
          <Campo label="Entregador" valor={entrega.entregador_nome} />
          <Campo label="Data/Hora" valor={new Date(entrega.data_hora).toLocaleString('pt-BR', { dateStyle: 'full', timeStyle: 'medium' })} />
          <Campo label="Status" valor={entrega.status} />
          <Campo label="Latitude" valor={Number(entrega.latitude).toFixed(6)} mono />
          <Campo label="Longitude" valor={Number(entrega.longitude).toFixed(6)} mono />
        </div>
      </div>

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
        {entrega.imagens.length === 0 ? (
          <div style={s.semImagens}>
            <span style={{ fontSize: '2rem' }}>🖼️</span>
            <p style={{ color: colors.textSecondary, fontFamily: fonts.body }}>Nenhuma imagem associada.</p>
          </div>
        ) : (
          <div style={s.imagensGrid}>
            {canhoto && <ImagemCard titulo="Canhoto" url={canhoto.url_arquivo} onClick={() => setImagemAmpliada(canhoto.url_arquivo)} />}
            {local && <ImagemCard titulo="Local de Entrega" url={local.url_arquivo} onClick={() => setImagemAmpliada(local.url_arquivo)} />}
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

      {imagemAmpliada && (
        <div style={s.overlay} onClick={() => setImagemAmpliada(null)}>
          <div style={s.overlayContent} onClick={(e) => e.stopPropagation()}>
            <button style={s.btnFechar} onClick={() => setImagemAmpliada(null)}>✕</button>
            <img src={imagemAmpliada} alt="Imagem ampliada" style={s.imagemAmpliada} />
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

function ImagemCard({ titulo, url, onClick }: { titulo: string; url: string; onClick: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <span style={{ fontSize: '0.875rem', fontWeight: 600, color: colors.textSecondary, fontFamily: fonts.body }}>{titulo}</span>
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
};
