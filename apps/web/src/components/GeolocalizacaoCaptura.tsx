'use client';

import { useState } from 'react';
import { colors, fonts, radius } from '@/lib/brand';

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

export default function GeolocalizacaoCaptura({ onCapturada, onErro }: GeolocalizacaoCapturaProps) {
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
          setEstado({ tipo: 'erro_permissao' });
          onErro?.('Permissao de localizacao negada. Habilite nas configuracoes do navegador.');
        } else {
          const msg = err.code === 3 ? 'Tempo esgotado ao obter localizacao.' : 'Nao foi possivel obter a localizacao.';
          setEstado({ tipo: 'erro_tecnico', mensagem: msg });
          onErro?.(msg);
        }
      },
      { timeout: 10000 },
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {(estado.tipo === 'idle' || estado.tipo === 'carregando') && (
        <button type="button" onClick={capturar} disabled={estado.tipo === 'carregando'} style={estado.tipo === 'carregando' ? s.btnCarregando : s.btn}>
          {estado.tipo === 'carregando' ? (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <span style={s.spinner} /> Obtendo localizacao...
            </span>
          ) : '📍 Capturar Localizacao'}
        </button>
      )}

      {estado.tipo === 'capturada' && (
        <div style={s.sucessoBox}>
          <p style={{ margin: 0, fontWeight: 600, fontFamily: fonts.body, color: colors.success }}>Localizacao capturada</p>
          <p style={{ margin: '4px 0 0', fontSize: '13px', fontFamily: 'monospace', color: colors.textSecondary }}>
            {estado.lat.toFixed(6)} / {estado.lng.toFixed(6)}
          </p>
          <button type="button" onClick={capturar} style={s.btnRecapturar}>Recapturar</button>
        </div>
      )}

      {estado.tipo === 'erro_permissao' && (
        <div style={s.erroBox}>
          <p style={{ margin: 0, fontFamily: fonts.body, fontSize: '14px' }}>
            Permissao negada. Habilite a localizacao nas configuracoes do navegador.
          </p>
        </div>
      )}

      {estado.tipo === 'erro_tecnico' && (
        <div style={s.warningBox}>
          <p style={{ margin: 0, fontFamily: fonts.body, fontSize: '14px' }}>{estado.mensagem}</p>
          <button type="button" onClick={capturar} style={s.btnRetry}>Tentar novamente</button>
        </div>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  btn: { padding: '12px 16px', fontSize: '15px', borderRadius: radius.md, border: `1px solid ${colors.accentBorder}`, backgroundColor: colors.accentLight, color: colors.accent, cursor: 'pointer', width: '100%', fontFamily: fonts.body, fontWeight: 500 },
  btnCarregando: { padding: '12px 16px', fontSize: '15px', borderRadius: radius.md, border: `1px solid ${colors.border}`, backgroundColor: colors.bgSecondary, color: colors.textMuted, cursor: 'not-allowed', width: '100%', fontFamily: fonts.body },
  spinner: { display: 'inline-block', width: '14px', height: '14px', border: `2px solid ${colors.border}`, borderTopColor: colors.accent, borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  sucessoBox: { padding: '12px', borderRadius: radius.md, backgroundColor: colors.successBg, border: `1px solid ${colors.successBorder}`, display: 'flex', flexDirection: 'column', gap: '6px' },
  btnRecapturar: { background: 'none', border: 'none', color: colors.accent, fontSize: '13px', cursor: 'pointer', padding: 0, fontFamily: fonts.body, textDecoration: 'underline', alignSelf: 'flex-start' },
  erroBox: { padding: '12px', borderRadius: radius.md, backgroundColor: colors.errorBg, border: `1px solid ${colors.errorBorder}`, color: colors.error },
  warningBox: { padding: '12px', borderRadius: radius.md, backgroundColor: colors.warningBg, border: `1px solid ${colors.warningBorder}`, color: colors.warning, display: 'flex', flexDirection: 'column', gap: '8px' },
  btnRetry: { padding: '8px 14px', fontSize: '14px', borderRadius: radius.md, border: 'none', backgroundColor: colors.warning, color: '#fff', cursor: 'pointer', fontFamily: fonts.body, alignSelf: 'flex-start' },
};
