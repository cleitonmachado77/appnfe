'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getToken, buscarEntrega, type EntregaResponse } from '@/lib/api';

export default function DetalheEntregaPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [entrega, setEntrega] = useState<EntregaResponse | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [imagemAmpliada, setImagemAmpliada] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) { router.replace('/login'); return; }

    buscarEntrega(id, token)
      .then(setEntrega)
      .catch((e) => setErro(e instanceof Error ? e.message : 'Erro ao carregar entrega'))
      .finally(() => setCarregando(false));
  }, [id, router]);

  if (carregando) return <p style={s.info}>Carregando…</p>;
  if (erro) return <p style={s.erro}>{erro}</p>;
  if (!entrega) return null;

  const canhoto = entrega.imagens.find((i) => i.tipo === 'CANHOTO');
  const local = entrega.imagens.find((i) => i.tipo === 'LOCAL');

  return (
    <div>
      {/* Cabeçalho */}
      <div style={s.cabecalho}>
        <button onClick={() => router.back()} style={s.btnVoltar}>← Voltar</button>
        <h1 style={s.titulo}>Detalhe da Entrega</h1>
      </div>

      {/* Dados principais */}
      <div style={s.card}>
        <h2 style={s.secaoTitulo}>Informações</h2>
        <div style={s.grid}>
          <Campo label="Chave NF-e" valor={entrega.chave_nfe} mono />
          <Campo label="Entregador" valor={entrega.entregador_nome} />
          <Campo
            label="Data/Hora"
            valor={new Date(entrega.data_hora).toLocaleString('pt-BR', {
              dateStyle: 'full',
              timeStyle: 'medium',
            })}
          />
          <Campo label="Status" valor={entrega.status} />
          <Campo
            label="Latitude"
            valor={Number(entrega.latitude).toFixed(6)}
            mono
          />
          <Campo
            label="Longitude"
            valor={Number(entrega.longitude).toFixed(6)}
            mono
          />
        </div>
      </div>

      {/* Imagens */}
      <div style={s.card}>
        <h2 style={s.secaoTitulo}>Imagens</h2>

        {entrega.imagens.length === 0 ? (
          <div style={s.semImagens}>
            <span style={s.semImagensIcone}>🖼️</span>
            <p style={{ margin: 0, color: '#6b7280' }}>Nenhuma imagem associada a esta entrega.</p>
          </div>
        ) : (
          <div style={s.imagensGrid}>
            {canhoto && (
              <ImagemCard
                titulo="Canhoto"
                url={canhoto.url_arquivo}
                onClick={() => setImagemAmpliada(canhoto.url_arquivo)}
              />
            )}
            {local && (
              <ImagemCard
                titulo="Local de Entrega"
                url={local.url_arquivo}
                onClick={() => setImagemAmpliada(local.url_arquivo)}
              />
            )}
          </div>
        )}
      </div>

      {/* Modal de imagem ampliada */}
      {imagemAmpliada && (
        <div style={s.overlay} onClick={() => setImagemAmpliada(null)}>
          <div style={s.overlayContent} onClick={(e) => e.stopPropagation()}>
            <button style={s.btnFechar} onClick={() => setImagemAmpliada(null)}>✕</button>
            <img
              src={imagemAmpliada}
              alt="Imagem ampliada"
              style={s.imagemAmpliada}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function Campo({ label, valor, mono }: { label: string; valor: string; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
        {label}
      </span>
      <span style={{ fontSize: '0.9rem', color: '#111827', fontFamily: mono ? 'monospace' : undefined, wordBreak: 'break-all' }}>
        {valor}
      </span>
    </div>
  );
}

function ImagemCard({ titulo, url, onClick }: { titulo: string; url: string; onClick: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>{titulo}</span>
      <img
        src={url}
        alt={titulo}
        onClick={onClick}
        style={{
          width: '100%',
          maxHeight: '240px',
          objectFit: 'cover',
          borderRadius: '0.5rem',
          border: '1px solid #e5e7eb',
          cursor: 'zoom-in',
        }}
      />
      <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Clique para ampliar</span>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  info: { color: '#6b7280', fontSize: '0.875rem' },
  erro: { color: '#dc2626', fontSize: '0.875rem' },
  cabecalho: { display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' },
  titulo: { fontSize: '1.5rem', fontWeight: 700, color: '#111827', margin: 0 },
  btnVoltar: {
    background: 'none',
    border: '1px solid #d1d5db',
    borderRadius: '0.375rem',
    padding: '0.375rem 0.75rem',
    fontSize: '0.875rem',
    cursor: 'pointer',
    color: '#374151',
  },
  card: {
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '0.5rem',
    padding: '1.25rem',
    marginBottom: '1rem',
  },
  secaoTitulo: { fontSize: '1rem', fontWeight: 600, color: '#374151', margin: '0 0 1rem' },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: '1rem',
  },
  imagensGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: '1.25rem',
  },
  semImagens: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '2rem',
    backgroundColor: '#f9fafb',
    borderRadius: '0.5rem',
    border: '1px dashed #d1d5db',
  },
  semImagensIcone: { fontSize: '2rem' },
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  overlayContent: {
    position: 'relative',
    maxWidth: '90vw',
    maxHeight: '90vh',
  },
  btnFechar: {
    position: 'absolute',
    top: '-2rem',
    right: 0,
    background: 'none',
    border: 'none',
    color: '#fff',
    fontSize: '1.25rem',
    cursor: 'pointer',
    padding: '0.25rem 0.5rem',
  },
  imagemAmpliada: {
    maxWidth: '90vw',
    maxHeight: '85vh',
    objectFit: 'contain',
    borderRadius: '0.5rem',
  },
};
