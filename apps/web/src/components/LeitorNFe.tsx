'use client';

import { useEffect, useRef, useState } from 'react';
import { colors, fonts, radius } from '@/lib/brand';

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

  useEffect(() => { return () => { pararScanner(); }; }, []);

  async function iniciarComBarcodeDetector() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const detector = new (window as any).BarcodeDetector({ formats: ['code_128', 'code_39', 'ean_13', 'ean_8', 'itf', 'qr_code', 'data_matrix'] });
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } } });
    streamRef.current = stream;
    if (!videoRef.current) return;
    videoRef.current.srcObject = stream;
    await videoRef.current.play();
    ativoRef.current = true;

    async function tick() {
      if (!ativoRef.current || !videoRef.current || !canvasRef.current) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video.readyState < 2) { rafRef.current = requestAnimationFrame(tick); return; }
      canvas.width = video.videoWidth; canvas.height = video.videoHeight;
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
            ativoRef.current = false; pararStream();
            setChave(chaveExtraida); setErroValidacao(null); setEstadoScanner('sucesso');
            onChaveCapturada(chaveExtraida); return;
          }
        }
      } catch { /* frame sem codigo */ }
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
  }

  async function iniciarComZxing() {
    const { BrowserMultiFormatReader } = await import('@zxing/browser');
    const { BarcodeFormat, DecodeHintType } = await import('@zxing/library');
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.CODE_128, BarcodeFormat.CODE_39, BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.ITF, BarcodeFormat.QR_CODE]);
    hints.set(DecodeHintType.TRY_HARDER, true);
    const reader = new BrowserMultiFormatReader(hints);
    if (!videoRef.current) return;
    const controls = await reader.decodeFromConstraints(
      { video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } } },
      videoRef.current,
      (result, err) => {
        if (result) {
          const texto = result.getText(); setUltimoLido(texto);
          const chaveExtraida = extrairChave(texto);
          if (chaveExtraida) {
            controls.stop(); zxingControlsRef.current = null;
            setChave(chaveExtraida); setErroValidacao(null); setEstadoScanner('sucesso');
            onChaveCapturada(chaveExtraida);
          }
        }
        void err;
      },
    );
    zxingControlsRef.current = controls;
  }

  async function iniciarScanner() {
    setErroScanner(null); setUltimoLido(null); setEstadoScanner('ativo'); ativoRef.current = true;
    try {
      if (temBarcodeDetectorNativo()) await iniciarComBarcodeDetector();
      else await iniciarComZxing();
    } catch (err) {
      setErroScanner(err instanceof Error ? err.message : 'Nao foi possivel acessar a camera.');
      setEstadoScanner('erro');
    }
  }

  function pararStream() {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  function pararScanner() {
    ativoRef.current = false; pararStream();
    if (zxingControlsRef.current) { try { zxingControlsRef.current.stop(); } catch { /* ignora */ } zxingControlsRef.current = null; }
    setEstadoScanner('inativo');
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setChave(e.target.value.replace(/\D/g, '').slice(0, 44));
    setErroValidacao(null);
  }

  function handleConfirmar() {
    if (!CHAVE_REGEX.test(chave)) { setErroValidacao('A chave NF-e deve conter exatamente 44 digitos numericos.'); return; }
    setErroValidacao(null); onChaveCapturada(chave);
  }

  const progresso = Math.round((chave.length / 44) * 100);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Input */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <label htmlFor="chave-nfe-input" style={{ fontSize: '13px', fontWeight: 500, color: colors.textSecondary, fontFamily: fonts.body }}>
          Chave NF-e (44 digitos)
        </label>
        <input
          id="chave-nfe-input"
          type="text"
          inputMode="numeric"
          value={chave}
          onChange={handleInputChange}
          placeholder="Digite ou escaneie a chave NF-e"
          maxLength={44}
          style={{ ...s.input, borderColor: erroValidacao ? colors.error : chave.length === 44 ? colors.success : colors.border }}
        />
        {/* Barra de progresso */}
        <div style={s.progressoTrack}>
          <div style={{ ...s.progressoBar, width: `${progresso}%`, backgroundColor: chave.length === 44 ? colors.success : colors.accent }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          {erroValidacao && <p style={{ margin: 0, fontSize: '12px', color: colors.error, fontFamily: fonts.body }}>{erroValidacao}</p>}
          <p style={{ margin: 0, fontSize: '12px', color: colors.textMuted, fontFamily: fonts.body, marginLeft: 'auto' }}>{chave.length}/44</p>
        </div>
      </div>

      {/* Botoes quando inativo/sucesso */}
      {(estadoScanner === 'inativo' || estadoScanner === 'sucesso') && (
        <>
          <button type="button" onClick={handleConfirmar} style={s.btnPrimario}>Confirmar Chave</button>
          <button type="button" onClick={iniciarScanner} style={s.btnOutline}>📷 Escanear Codigo de Barras</button>
        </>
      )}

      {/* Scanner ativo */}
      {estadoScanner === 'ativo' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={s.scannerWrap}>
            <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} muted playsInline autoPlay />
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            <div style={s.scannerOverlay} />
            <div style={s.scannerLinha} />
            <p style={s.scannerDica}>Centralize o codigo de barras</p>
          </div>
          {ultimoLido && <p style={{ margin: 0, fontSize: '11px', color: colors.textMuted, wordBreak: 'break-all', fontFamily: 'monospace' }}>Lido: {ultimoLido}</p>}
          <button type="button" onClick={pararScanner} style={s.btnCancelar}>Cancelar</button>
        </div>
      )}

      {/* Erro de camera */}
      {estadoScanner === 'erro' && erroScanner && (
        <div style={s.erroBox}>
          <p style={{ margin: 0, fontSize: '14px', fontFamily: fonts.body }}>Nao foi possivel iniciar a camera: {erroScanner}</p>
          <p style={{ margin: '4px 0 0', fontSize: '13px', fontFamily: fonts.body, color: colors.textSecondary }}>Use o campo acima para digitar a chave manualmente.</p>
          <button type="button" onClick={() => setEstadoScanner('inativo')} style={s.btnRetry}>OK</button>
        </div>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  input: { padding: '12px', fontSize: '15px', borderRadius: radius.md, border: `1px solid ${colors.border}`, outline: 'none', width: '100%', boxSizing: 'border-box', backgroundColor: colors.bgSecondary, color: colors.textPrimary, fontFamily: 'monospace', transition: 'border-color 0.2s' },
  progressoTrack: { height: '3px', backgroundColor: colors.border, borderRadius: '2px', overflow: 'hidden' },
  progressoBar: { height: '100%', borderRadius: '2px', transition: 'width 0.3s ease' },
  btnPrimario: { padding: '12px 16px', fontSize: '15px', borderRadius: radius.md, border: 'none', backgroundColor: colors.accent, color: '#fff', cursor: 'pointer', width: '100%', fontFamily: fonts.title, fontWeight: 600 },
  btnOutline: { padding: '12px 16px', fontSize: '15px', borderRadius: radius.md, border: `1px solid ${colors.accentBorder}`, backgroundColor: colors.accentLight, color: colors.accent, cursor: 'pointer', width: '100%', fontFamily: fonts.body },
  scannerWrap: { position: 'relative', width: '100%', borderRadius: radius.md, overflow: 'hidden', border: `1px solid ${colors.border}`, backgroundColor: '#000', aspectRatio: '16/9' },
  scannerOverlay: { position: 'absolute', top: '35%', left: '5%', right: '5%', height: '30%', border: `2px solid ${colors.accent}`, borderRadius: '4px', boxShadow: 'inset 0 0 0 2000px rgba(0,0,0,0.3)' },
  scannerLinha: { position: 'absolute', top: '50%', left: '5%', right: '5%', height: '2px', backgroundColor: colors.accent, transform: 'translateY(-50%)', boxShadow: `0 0 8px 2px ${colors.accentLight}` },
  scannerDica: { position: 'absolute', bottom: '8px', left: 0, right: 0, textAlign: 'center', margin: 0, fontSize: '12px', color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.9)', fontFamily: fonts.body },
  btnCancelar: { padding: '12px 16px', fontSize: '15px', borderRadius: radius.md, border: `1px solid ${colors.border}`, backgroundColor: 'transparent', color: colors.textSecondary, cursor: 'pointer', width: '100%', fontFamily: fonts.body },
  erroBox: { padding: '12px', borderRadius: radius.md, backgroundColor: colors.errorBg, border: `1px solid ${colors.errorBorder}`, color: colors.error, display: 'flex', flexDirection: 'column', gap: '8px' },
  btnRetry: { padding: '8px 14px', fontSize: '14px', borderRadius: radius.md, border: 'none', backgroundColor: colors.error, color: '#fff', cursor: 'pointer', fontFamily: fonts.body, alignSelf: 'flex-start' },
};
