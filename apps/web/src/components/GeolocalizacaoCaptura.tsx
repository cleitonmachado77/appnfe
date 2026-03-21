'use client';

import { useState } from 'react';

type Estado =
  | { tipo: 'idle' }
  | { tipo: 'carregando' }
  | { tipo: 'capturada'; lat: number; lng: number }
  | { tipo: 'erro_permissao' }
  | { tipo: 'erro_tecnico'; mensagem: string };

interface GeolocalizacaoCapturaProps {
  onCapturada: (lat: number, lng: number) => void;
  onErro?: (msg: string) => void;
}

export default function GeolocalizacaoCaptura({
  onCapturada,
  onErro,
}: GeolocalizacaoCapturaProps) {
  const [estado, setEstado] = useState<Estado>({ tipo: 'idle' });

  function capturar() {
    setEstado({ tipo: 'carregando' });

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setEstado({ tipo: 'capturada', lat, lng });
        onCapturada(lat, lng);
      },
      (err) => {
        if (err.code === 1) {
          // PERMISSION_DENIED
          const msg =
            'Permissão de localização negada. Habilite nas configurações do navegador.';
          setEstado({ tipo: 'erro_permissao' });
          onErro?.(msg);
        } else {
          // POSITION_UNAVAILABLE (2) ou TIMEOUT (3)
          const msg =
            err.code === 3
              ? 'Tempo esgotado ao obter localização. Tente novamente.'
              : 'Não foi possível obter a localização. Tente novamente.';
          setEstado({ tipo: 'erro_tecnico', mensagem: msg });
          onErro?.(msg);
        }
      },
      { timeout: 10000 },
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {/* Estado: idle ou carregando */}
      {(estado.tipo === 'idle' || estado.tipo === 'carregando') && (
        <button
          type="button"
          onClick={capturar}
          disabled={estado.tipo === 'carregando'}
          style={{
            padding: '12px 16px',
            fontSize: '16px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: estado.tipo === 'carregando' ? '#9ca3af' : '#2563eb',
            color: '#fff',
            cursor: estado.tipo === 'carregando' ? 'not-allowed' : 'pointer',
            width: '100%',
          }}
        >
          {estado.tipo === 'carregando' ? 'Obtendo localização…' : 'Capturar Localização'}
        </button>
      )}

      {/* Estado: capturada com sucesso */}
      {estado.tipo === 'capturada' && (
        <div
          style={{
            padding: '12px',
            borderRadius: '8px',
            backgroundColor: '#dcfce7',
            border: '1px solid #16a34a',
            color: '#15803d',
          }}
        >
          <p style={{ margin: 0, fontWeight: 600 }}>✓ Localização capturada</p>
          <p style={{ margin: '4px 0 0', fontSize: '14px' }}>
            Lat: {estado.lat.toFixed(6)} &nbsp;|&nbsp; Lng: {estado.lng.toFixed(6)}
          </p>
        </div>
      )}

      {/* Estado: permissão negada — bloqueia envio, sem botão de retry */}
      {estado.tipo === 'erro_permissao' && (
        <div
          style={{
            padding: '12px',
            borderRadius: '8px',
            backgroundColor: '#fef2f2',
            border: '1px solid #dc2626',
            color: '#b91c1c',
          }}
        >
          <p style={{ margin: 0 }}>
            Permissão de localização negada. Habilite nas configurações do navegador.
          </p>
        </div>
      )}

      {/* Estado: erro técnico (timeout / indisponível) — mostra botão de retry */}
      {estado.tipo === 'erro_tecnico' && (
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
          <p style={{ margin: 0 }}>{estado.mensagem}</p>
          <button
            type="button"
            onClick={capturar}
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
            Tentar novamente
          </button>
        </div>
      )}
    </div>
  );
}
