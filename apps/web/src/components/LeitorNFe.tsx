'use client';

import { useEffect, useRef, useState } from 'react';

const CHAVE_REGEX = /^\d{44}$/;

/** Extrai a chave NF-e (44 dígitos) de um texto lido pelo scanner.
 *  QR Codes de NF-e costumam conter a chave embutida em uma URL ou como texto puro. */
function extrairChave(texto: string): string | null {
  // Tenta encontrar 44 dígitos consecutivos no texto
  const match = texto.match(/\d{44}/);
  return match ? match[0] : null;
}

interface LeitorNFeProps {
  onChaveCapturada: (chave: string) => void;
  valorInicial?: string;
}

type EstadoScanner = 'inativo' | 'ativo' | 'erro';

export default function LeitorNFe({ onChaveCapturada, valorInicial = '' }: LeitorNFeProps) {
  const [chave, setChave] = useState(valorInicial);
  const [erroValidacao, setErroValidacao] = useState<string | null>(null);
  const [estadoScanner, setEstadoScanner] = useState<EstadoScanner>('inativo');
  const [erroScanner, setErroScanner] = useState<string | null>(null);

  // Referência para a instância do Html5Qrcode (carregada dinamicamente)
  const scannerRef = useRef<InstanceType<typeof import('html5-qrcode').Html5Qrcode> | null>(null);
  const elementoId = 'leitor-qrcode';

  // Limpa o scanner ao desmontar o componente
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
      // Dynamic import — evita SSR do Next.js
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode');

      scannerRef.current = new Html5Qrcode(elementoId);

      const formatos = [
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.QR_CODE,
      ];

      await scannerRef.current.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 300, height: 150 }, formatsToSupport: formatos },
        (textoDecodificado) => {
          const chaveExtraida = extrairChave(textoDecodificado);
          if (chaveExtraida) {
            setChave(chaveExtraida);
            setErroValidacao(null);
            onChaveCapturada(chaveExtraida);
            pararScanner();
          }
        },
        // Callback de erro de frame — ignorado silenciosamente
        () => {},
      );
    } catch (err) {
      const mensagem =
        err instanceof Error ? err.message : 'Não foi possível acessar a câmera.';
      setErroScanner(mensagem);
      setEstadoScanner('erro');
    }
  }

  async function pararScanner() {
    if (scannerRef.current) {
      try {
        const estado = scannerRef.current.getState();
        // Estado 2 = SCANNING
        if (estado === 2) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch {
        // Ignora erros ao parar (ex: câmera já fechada)
      } finally {
        scannerRef.current = null;
      }
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
      {/* Campo de input manual */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <label
          htmlFor="chave-nfe-input"
          style={{ fontSize: '14px', fontWeight: 600, color: '#374151' }}
        >
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
        {erroValidacao && (
          <p style={{ margin: 0, fontSize: '13px', color: '#dc2626' }}>{erroValidacao}</p>
        )}
        <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>
          {chave.length}/44 dígitos
        </p>
      </div>

      {/* Botão confirmar input manual */}
      {estadoScanner === 'inativo' && (
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
      )}

      {/* Botão iniciar scanner */}
      {estadoScanner === 'inativo' && (
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
      )}

      {/* Área do scanner de câmera */}
      {estadoScanner === 'ativo' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div
            id={elementoId}
            style={{
              width: '100%',
              borderRadius: '8px',
              overflow: 'hidden',
              border: '1px solid #d1d5db',
            }}
          />
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
            Parar leitura
          </button>
        </div>
      )}

      {/* Erro ao acessar câmera — fallback para input manual */}
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
          <p style={{ margin: 0, fontSize: '14px' }}>
            Não foi possível iniciar a câmera: {erroScanner}
          </p>
          <p style={{ margin: 0, fontSize: '13px' }}>
            Use o campo acima para digitar a chave manualmente.
          </p>
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
