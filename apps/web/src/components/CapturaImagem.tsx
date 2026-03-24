'use client';

import imageCompression from 'browser-image-compression';
import { useRef, useState } from 'react';
import { colors, fonts, radius } from '@/lib/brand';

const FORMATOS_ACEITOS = ['image/jpeg', 'image/png'];

interface CapturaImagemProps {
  tipo: 'CANHOTO' | 'LOCAL';
  label: string;
  onImagemSelecionada: (file: File) => void;
}

export default function CapturaImagem({ tipo, label, onImagemSelecionada }: CapturaImagemProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [comprimindo, setComprimindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = `captura-imagem-${tipo.toLowerCase()}`;

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    setErro(null); setPreview(null);

    if (!FORMATOS_ACEITOS.includes(arquivo.type)) {
      setErro('Formato invalido. Use JPEG ou PNG.');
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    setComprimindo(true);
    try {
      const comprimido = await imageCompression(arquivo, { maxSizeMB: 2, maxWidthOrHeight: 1920, useWebWorker: true });
      const arquivoFinal = new File([comprimido], arquivo.name, { type: arquivo.type });
      setPreview(URL.createObjectURL(arquivoFinal));
      onImagemSelecionada(arquivoFinal);
    } catch {
      setErro('Erro ao processar a imagem. Tente novamente.');
    } finally {
      setComprimindo(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <label htmlFor={inputId} style={{ fontSize: '13px', fontWeight: 500, color: colors.textSecondary, fontFamily: fonts.body }}>
        {label}
      </label>

      <label htmlFor={inputId} style={s.uploadArea}>
        <span style={{ fontSize: '24px' }}>📷</span>
        <span style={{ fontSize: '14px', color: colors.textSecondary, fontFamily: fonts.body }}>
          {preview ? 'Trocar foto' : 'Tirar foto ou selecionar'}
        </span>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="image/jpeg,image/png"
          capture="environment"
          onChange={handleChange}
          disabled={comprimindo}
          style={{ display: 'none' }}
        />
      </label>

      {comprimindo && (
        <div style={s.loadingBox}>
          <span style={s.spinner} />
          <span style={{ fontSize: '13px', color: colors.info, fontFamily: fonts.body }}>Comprimindo imagem...</span>
        </div>
      )}

      {erro && <p style={{ margin: 0, fontSize: '13px', color: colors.error, fontFamily: fonts.body }}>{erro}</p>}

      {preview && !comprimindo && (
        <img src={preview} alt={`Preview ${label}`} style={{ width: '100%', maxHeight: '220px', objectFit: 'cover', borderRadius: radius.md, border: `1px solid ${colors.border}` }} />
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  uploadArea: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    gap: '8px', padding: '20px', borderRadius: radius.md,
    border: `1px dashed ${colors.accentBorder}`, backgroundColor: colors.accentLight,
    cursor: 'pointer', transition: 'all 0.2s',
  },
  loadingBox: {
    display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px',
    borderRadius: radius.md, backgroundColor: colors.infoBg, border: `1px solid ${colors.infoBorder}`,
  },
  spinner: {
    display: 'inline-block', width: '14px', height: '14px',
    border: `2px solid ${colors.infoBorder}`, borderTopColor: colors.info,
    borderRadius: '50%', animation: 'spin 0.8s linear infinite',
  },
};
