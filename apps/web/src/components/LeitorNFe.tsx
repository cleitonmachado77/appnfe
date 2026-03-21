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

// Verifica se o browser suporta BarcodeDetector nativo
function temBarcodeDetectorNativo(): boolean {
  return typeof window !== 'undefined' && 'BarcodeDetector' in window;
}

export default function LeitorNFe({ onChaveCapturada, valorInicial = '' }: LeitorNFeProps) {
  const [chave, setChave] = useState(valorInicial);
  const [erroValidacao, setErroValidacao] = useState<string | null>(null);
  const [estadoScanner, setEstadoScanner] = useState<EstadoScanner>('inativo');
  const [erroScanner, setErroScanner] = useState<string | null>(null);
  const [ultimoLido, setUltimoLido] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const zxingControlsRef = useRef<{ stop: () => void } | null>(null);
  const ativoRef = useRef(false);

  useEffect(() => {
    return () => { pararScanner(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Estratégia 1: BarcodeDetector nativo (Chrome Android, Chrome desktop) ──
  async function iniciarComBarcodeDetector() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const detector = new (window as any).BarcodeDetector({
      formats: ['code_128', 'code_39', 'ean_13', 'ean_8', 'itf', 'qr_code', 'data_matrix'],
    });

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
    });

    streamRef.current = stream;
    if (!videoRef.current) return;
    videoRef.current.srcObject = stream;
    await videoRef.current.play();

    ativoRef.current = true;

    async function tick() {
      if (!ativoRef.current || !videoRef.current || !canvasRef.current) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video.readyState < 2) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(video, 0, 0);

      try {
        const resultados = await detector.detect(canvas);
        for (const r of resultados) {
          const texto = r.rawValue as string;
          setUltimoLido(texto);
          const chaveExtraida = extrairChave(texto);
          if (chaveExtraida) {
            ativoRef.current = false;
            pararStream();
            setChave(chaveExtraida);
            setErroValidacao(null);
            setEstadoScanner('sucesso');
            onChaveCapturada(chaveExtraida);
            return;
          }
        }
      } catch {
        // frame sem código — normal
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
  }

  // ── Estratégia 2: @zxing/browser (fallback para Safari/Firefox) ──
  async function iniciarComZxing() {
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
      { video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } } },
      videoRef.current,
      (result, err) => {
        if (result) {
          const texto = result.getText();
          setUltimoLido(texto);
          const chaveExtraida = extrairChave(texto);
          if (chaveExtraida) {
            controls.stop();
            zxingControlsRef.current = null;
            setChave(chaveExtraida);
            setErroValidacao(null);
            setEstadoScanner('sucesso');
            onChaveCapturada(chaveExtraida);
          }
        }
        void err;
      },
    );

    zxingControlsRef.current = controls;
  }

  async function iniciarScanner() {
    setErroScanner(null);
    setUltimoLido(null);
    setEstadoScanner('ativo');
    ativoRef.current = true;

    try {
      if (temBarcodeDetectorNativo()) {
        await iniciarComBarcodeDetector();
      } else {
        await iniciarComZxing();
      }
    } catch (err) {
      const mensagem = err instanceof Error ? err.message : 'Não foi possível acessar a câmera.';
      setErroScanner(mensagem);
      setEstadoScanner('erro');
    }
  }

  function pararStream() {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) { videoRef.current.srcObject = null; }
  }

  function pararScanner() {
    ativoRef.current = false;
    pararStream();
    if (zxingControlsRef.current) {
      try { zxingControlsRef.current.stop(); } catch { /* ignora */ }
      zxingControlsRef.current = null;
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
            padding: '12px', fontSize: '15px', borderRadius: '8px',
            border: erroValidacao ? '1px solid #dc2626' : '1px solid #d1d5db',
            outline: 'none', width: '100%', boxSizing: 'border-box',
          }}
        />
        {erroValidacao && <p style={{ margin: 0, fontSize: '13px', color: '#dc2626' }}>{erroValidacao}</p>}
        <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>{chave.length}/44 dígitos</p>
      </div>

      {/* Botões quando inativo/sucesso */}
      {(estadoScanner === 'inativo' || estadoScanner === 'sucesso') && (
        <>
          <button type="button" onClick={handleConfirmar}
            style={{ padding: '12px 16px', fontSize: '16px', borderRadius: '8px', border: 'none', backgroundColor: '#2563eb', color: '#fff', cursor: 'pointer', width: '100%' }}>
            Confirmar Chave
          </button>
          <button type="button" onClick={iniciarScanner}
            style={{ padding: '12px 16px', fontSize: '16px', borderRadius: '8px', border: '1px solid #2563eb', backgroundColor: '#fff', color: '#2563eb', cursor: 'pointer', width: '100%' }}>
            📷 Escanear Código de Barras
          </button>
        </>
      )}

      {/* Scanner ativo */}
      {estadoScanner === 'ativo' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ position: 'relative', width: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid #d1d5db', backgroundColor: '#000', aspectRatio: '16/9' }}>
            <video
              ref={videoRef}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              muted playsInline autoPlay
            />
            {/* Canvas oculto para processamento de frames */}
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            {/* Área de leitura — faixa horizontal central */}
            <div style={{
              position: 'absolute', top: '35%', left: '5%', right: '5%', height: '30%',
              border: '2px solid rgba(239,68,68,0.8)', borderRadius: '4px',
              boxShadow: 'inset 0 0 0 2000px rgba(0,0,0,0.25)',
            }} />
            {/* Linha de mira */}
            <div style={{
              position: 'absolute', top: '50%', left: '5%', right: '5%', height: '2px',
              backgroundColor: '#ef4444', transform: 'translateY(-50%)',
              boxShadow: '0 0 8px 2px rgba(239,68,68,0.7)',
            }} />

            <p style={{
              position: 'absolute', bottom: '8px', left: 0, right: 0,
              textAlign: 'center', margin: 0, fontSize: '13px', color: '#fff',
              textShadow: '0 1px 3px rgba(0,0,0,0.9)',
            }}>
              Centralize o código de barras na faixa vermelha
            </p>
          </div>

          {/* Debug: mostra o último valor lido (qualquer código) */}
          {ultimoLido && (
            <p style={{ margin: 0, fontSize: '11px', color: '#6b7280', wordBreak: 'break-all' }}>
              Lido: {ultimoLido}
            </p>
          )}

          <button type="button" onClick={pararScanner}
            style={{ padding: '12px 16px', fontSize: '16px', borderRadius: '8px', border: 'none', backgroundColor: '#6b7280', color: '#fff', cursor: 'pointer', width: '100%' }}>
            Cancelar
          </button>
        </div>
      )}

      {/* Erro de câmera */}
      {estadoScanner === 'erro' && erroScanner && (
        <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#fff7ed', border: '1px solid #ea580c', color: '#c2410c', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <p style={{ margin: 0, fontSize: '14px' }}>Não foi possível iniciar a câmera: {erroScanner}</p>
          <p style={{ margin: 0, fontSize: '13px' }}>Use o campo acima para digitar a chave manualmente.</p>
          <button type="button" onClick={() => setEstadoScanner('inativo')}
            style={{ padding: '10px 16px', fontSize: '15px', borderRadius: '8px', border: 'none', backgroundColor: '#ea580c', color: '#fff', cursor: 'pointer', width: '100%' }}>
            OK
          </button>
        </div>
      )}
    </div>
  );
}
