'use client';

import imageCompression from 'browser-image-compression';
import { useRef, useState } from 'react';

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

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;

    setErro(null);
    setPreview(null);

    if (!FORMATOS_ACEITOS.includes(arquivo.type)) {
      setErro('Formato inválido. Use JPEG ou PNG.');
      // Limpa o input para permitir nova seleção
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    setComprimindo(true);
    try {
      const comprimido = await imageCompression(arquivo, {
        maxSizeMB: 2,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      });

      // Garante que o arquivo comprimido mantenha o nome e tipo originais
      const arquivoFinal = new File([comprimido], arquivo.name, { type: arquivo.type });

      const urlPreview = URL.createObjectURL(arquivoFinal);
      setPreview(urlPreview);
      onImagemSelecionada(arquivoFinal);
    } catch {
      setErro('Erro ao processar a imagem. Tente novamente.');
    } finally {
      setComprimindo(false);
    }
  }

  const inputId = `captura-imagem-${tipo.toLowerCase()}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <label
        htmlFor={inputId}
        style={{ fontSize: '14px', fontWeight: 600, color: '#374151' }}
      >
        {label}
      </label>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/jpeg,image/png"
        capture="environment"
        onChange={handleChange}
        disabled={comprimindo}
        style={{ fontSize: '14px', color: '#374151' }}
      />

      {/* Indicador de loading durante compressão */}
      {comprimindo && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 12px',
            borderRadius: '8px',
            backgroundColor: '#eff6ff',
            border: '1px solid #bfdbfe',
            color: '#1d4ed8',
            fontSize: '14px',
          }}
        >
          <span
            style={{
              display: 'inline-block',
              width: '16px',
              height: '16px',
              border: '2px solid #bfdbfe',
              borderTopColor: '#1d4ed8',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          Comprimindo imagem…
        </div>
      )}

      {/* Mensagem de erro */}
      {erro && (
        <p style={{ margin: 0, fontSize: '13px', color: '#dc2626' }}>{erro}</p>
      )}

      {/* Preview da imagem após compressão */}
      {preview && !comprimindo && (
        <img
          src={preview}
          alt={`Preview ${label}`}
          style={{
            width: '100%',
            maxHeight: '220px',
            objectFit: 'cover',
            borderRadius: '8px',
            border: '1px solid #d1d5db',
          }}
        />
      )}

      {/* CSS da animação de spin via style tag inline */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
