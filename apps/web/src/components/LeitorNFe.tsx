'use client';

import { useEffect, useRef, useState } from 'react';

const CHAVE_REGEX = /^\d{44}$/;

function extrairChave(texto: string): string | null {
  const match = texto.match(/\d{44}/);
  return match ? match[0] : null;
}

interface LeitorNFeProps {
  onChaveCapturada: (chave: string) => void;
  valorInicial?: string;
}

type EstadoScanner = 'inativo' | 'ativo' | 'erro' | 'sucesso';

export default function LeitorNFe({ onChaveCapturada, valorInicial = '' }: LeitorNFeProps) {
  const [chave, setChave] = useState(valorInicial);
  const [erroValidacao, setErroValidacao] = useState<string | null>(null);
  const [estadoScanner, setEstadoScanner] = useState<EstadoScanner>('inativo');
  const [erroScanner, setErroScanner] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);

  useEffect(() => {
    return () => {
      pararScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function iniciarScanner() {
    setErroScanner(null);
    setEstadoScanner('ativo');

    try {
      const { BrowserMultiFormatReader } = await import('@zxing/browser');
      const { BarcodeFormat, DecodeHintType } = await import('@zxing/library');

      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39,
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.ITF,
        BarcodeFormat.QR_CODE,
      ]);
      hints.set(DecodeHintType.TRY_HARDER, true);

      const reader = new BrowserMultiFormatReader(hints);

      if (!videoRef.current) return;

      const controls = await reader.decodeFromConstraints(
        {
          video: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        },
        videoRef.current,
        (result, err) => {
          if (result) {
            const texto = result.getText();
            const chaveExtraida = extrairChave(texto);
            if (chaveExtraida) {
              setChave(chaveExtraida);
              setErroValidacao(null);
              setEstadoScanner('sucesso');
              controls.stop();
              controlsRef.current = null;
              onChaveCapturada(chaveExtraida);
            }
          }
          void err;
        },
      );

      controlsRef.current = controls;
    } catch (err) {
      const mensagem = err instanceof Error ? err.message : 'Não foi possível acessar a câmera.';
      setErroScanner(mensagem);
      setEstadoScanner('erro');
    }
  }

  function pararScanner() {
    if (controlsRef.current) {
      try {
        controlsRef.current.stop();
      } catch {
        // ignora
      }
      controlsRef.current = null;
    }
    setEstadoScanner('inativo');
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const valor = e.target.value.replace(/\D/g, '').slice(0, 44);
    setChave(valor);
    setErroValidacao(null);
  }

  function handleConfirmar() {
    if (!CHAVE_REGEX.test(chave)) {
      setErroValidacao('A chave NF-e deve conter exatamente 44 dígitos numéricos.');
      return;
    }
    setErroValidacao(null);
    onChaveCapturada(chave);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Input manual */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <label htmlFor="chave-nfe-input" style={{ fontSize: '14px', fontWeight: 600, color: '#374151' }}>
          Chave NF-e (44 dígitos)
        </label>
        <input
          id="chave-nfe-input"
          type="text"
          inputMode="numeric"
          value={chave}
          onChange={handleInputChange}
          placeholder="Digite ou escaneie a chave NF-e"
          maxLength={44}
          style={{
            padding: '12px',
            fontSize: '15px',
            borderRadius: '8px',
            border: erroValidacao ? '1px solid #dc2626' : '1px solid #d1d5db',
            outline: 'none',
            width: '100%',
            boxSizing: 'border-box',
          }}
        />
        {erroValidacao && <p style={{ margin: 0, fontSize: '13px', color: '#dc2626' }}>{erroValidacao}</p>}
        <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>{chave.length}/44 dígitos</p>
      </div>

      {/* Botões quando inativo */}
      {(estadoScanner === 'inativo' || estadoScanner === 'sucesso') && (
        <>
          <button
            type="button"
            onClick={handleConfirmar}
            style={{
              padding: '12px 16px',
              fontSize: '16px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#2563eb',
              color: '#fff',
              cursor: 'pointer',
              width: '100%',
            }}
          >
            Confirmar Chave
          </button>
          <button
            type="button"
            onClick={iniciarScanner}
            style={{
              padding: '12px 16px',
              fontSize: '16px',
              borderRadius: '8px',
              border: '1px solid #2563eb',
              backgroundColor: '#fff',
              color: '#2563eb',
              cursor: 'pointer',
              width: '100%',
            }}
          >
            📷 Escanear Código de Barras
          </button>
        </>
      )}

      {/* Scanner ativo — vídeo horizontal com linha de mira */}
      {estadoScanner === 'ativo' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div
            style={{
              position: 'relative',
              width: '100%',
              borderRadius: '8px',
              overflow: 'hidden',
              border: '1px solid #d1d5db',
              backgroundColor: '#000',
              aspectRatio: '16/9',
            }}
          >
            <video
              ref={videoRef}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              muted
              playsInline
            />
            {/* Linha de mira horizontal — igual apps de banco */}
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '10%',
                right: '10%',
                height: '2px',
                backgroundColor: '#ef4444',
                transform: 'translateY(-50%)',
                boxShadow: '0 0 6px 2px rgba(239,68,68,0.6)',
              }}
            />
            {/* Cantos do frame de mira */}
            {[
              { top: '25%', left: '10%', borderTop: '3px solid #ef4444', borderLeft: '3px solid #ef4444' },
              { top: '25%', right: '10%', borderTop: '3px solid #ef4444', borderRight: '3px solid #ef4444' },
              { bottom: '25%', left: '10%', borderBottom: '3px solid #ef4444', borderLeft: '3px solid #ef4444' },
              { bottom: '25%', right: '10%', borderBottom: '3px solid #ef4444', borderRight: '3px solid #ef4444' },
            ].map((style, i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  width: '20px',
                  height: '20px',
                  ...style,
                }}
              />
            ))}
            <p
              style={{
                position: 'absolute',
                bottom: '8px',
                left: 0,
                right: 0,
                textAlign: 'center',
                margin: 0,
                fontSize: '13px',
                color: '#fff',
                textShadow: '0 1px 3px rgba(0,0,0,0.8)',
              }}
            >
              Aponte o código de barras para a linha vermelha
            </p>
          </div>
          <button
            type="button"
            onClick={pararScanner}
            style={{
              padding: '12px 16px',
              fontSize: '16px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#6b7280',
              color: '#fff',
              cursor: 'pointer',
              width: '100%',
            }}
          >
            Cancelar
          </button>
        </div>
      )}

      {/* Erro de câmera */}
      {estadoScanner === 'erro' && erroScanner && (
        <div
          style={{
            padding: '12px',
            borderRadius: '8px',
            backgroundColor: '#fff7ed',
            border: '1px solid #ea580c',
            color: '#c2410c',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <p style={{ margin: 0, fontSize: '14px' }}>Não foi possível iniciar a câmera: {erroScanner}</p>
          <p style={{ margin: 0, fontSize: '13px' }}>Use o campo acima para digitar a chave manualmente.</p>
          <button
            type="button"
            onClick={() => setEstadoScanner('inativo')}
            style={{
              padding: '10px 16px',
              fontSize: '15px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#ea580c',
              color: '#fff',
              cursor: 'pointer',
              width: '100%',
            }}
          >
            OK
          </button>
        </div>
      )}
    </div>
  );
}
