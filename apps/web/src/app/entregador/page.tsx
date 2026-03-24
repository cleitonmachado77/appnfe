'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import LeitorNFe from '@/components/LeitorNFe';
import CapturaImagem from '@/components/CapturaImagem';
import GeolocalizacaoCaptura from '@/components/GeolocalizacaoCaptura';
import { getToken, clearToken, uploadImagem, criarEntrega } from '@/lib/api';
import { colors, fonts, radius, shadow } from '@/lib/brand';

type EstadoEnvio = 'idle' | 'enviando' | 'sucesso' | 'erro';
let contadorReset = 0;

export default function EntregadorPage() {
  const router = useRouter();
  const [nomeUsuario, setNomeUsuario] = useState('');
  const [chaveNfe, setChaveNfe] = useState('');
  const [imagemCanhoto, setImagemCanhoto] = useState<File | null>(null);
  const [imagemLocal, setImagemLocal] = useState<File | null>(null);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [estadoEnvio, setEstadoEnvio] = useState<EstadoEnvio>('idle');
  const [mensagemErro, setMensagemErro] = useState('');
  const [resetKey, setResetKey] = useState(0);

  useEffect(() => {
    const token = getToken();
    if (!token) { router.replace('/login'); return; }
    setNomeUsuario(localStorage.getItem('nome') ?? 'Entregador');
  }, [router]);

  function limparFormulario() {
    contadorReset += 1;
    setChaveNfe(''); setImagemCanhoto(null); setImagemLocal(null);
    setLatitude(null); setLongitude(null);
    setEstadoEnvio('idle'); setMensagemErro('');
    setResetKey(contadorReset);
  }

  const formularioCompleto = chaveNfe.length === 44 && imagemCanhoto !== null && imagemLocal !== null && latitude !== null;

  async function handleEnviar() {
    const token = getToken();
    if (!token) { router.replace('/login'); return; }
    setEstadoEnvio('enviando'); setMensagemErro('');
    try {
      const [resultCanhoto, resultLocal] = await Promise.all([
        uploadImagem(imagemCanhoto!, token),
        uploadImagem(imagemLocal!, token),
      ]);
      await criarEntrega({
        chave_nfe: chaveNfe, latitude: latitude!, longitude: longitude!,
        imagens: [
          { url_arquivo: resultCanhoto.url_arquivo, tipo: 'CANHOTO' },
          { url_arquivo: resultLocal.url_arquivo, tipo: 'LOCAL' },
        ],
      }, token);
      setEstadoEnvio('sucesso');
    } catch (err) {
      setMensagemErro(err instanceof Error ? err.message : 'Erro inesperado. Tente novamente.');
      setEstadoEnvio('erro');
    }
  }

  const pendentes = [
    chaveNfe.length !== 44 && 'Chave NF-e',
    !imagemCanhoto && 'Foto do canhoto',
    !imagemLocal && 'Foto do local',
    latitude === null && 'Localizacao',
  ].filter(Boolean) as string[];

  return (
    <div style={s.page}>
      {/* Header */}
      <header style={s.header}>
        <Image src="/logo1.png" alt="ADD+" width={100} height={40} style={{ objectFit: 'contain' }} />
        <div style={s.headerRight}>
          <span style={s.headerNome}>{nomeUsuario}</span>
          <button type="button" onClick={() => { clearToken(); router.replace('/login'); }} style={s.btnSair}>Sair</button>
        </div>
      </header>

      <div style={s.body}>
        <h1 style={s.titulo}>Nova Entrega</h1>

        {/* Sucesso */}
        {estadoEnvio === 'sucesso' && (
          <div style={s.sucessoCard}>
            <div style={s.sucessoIcone}>✓</div>
            <p style={s.sucessoTitulo}>Entrega registrada!</p>
            <p style={s.sucessoDesc}>O comprovante foi enviado e esta disponivel para o gestor.</p>
            <button type="button" onClick={limparFormulario} style={s.btnPrimario}>
              Registrar nova entrega
            </button>
          </div>
        )}

        {estadoEnvio !== 'sucesso' && (
          <div style={s.form}>
            <Secao numero={1} titulo="Chave NF-e">
              <LeitorNFe key={`nfe-${resetKey}`} onChaveCapturada={setChaveNfe} />
            </Secao>

            <Secao numero={2} titulo="Foto do Canhoto">
              <CapturaImagem key={`canhoto-${resetKey}`} tipo="CANHOTO" label="Foto do canhoto assinado" onImagemSelecionada={setImagemCanhoto} />
            </Secao>

            <Secao numero={3} titulo="Foto do Local de Entrega">
              <CapturaImagem key={`local-${resetKey}`} tipo="LOCAL" label="Foto do local de entrega" onImagemSelecionada={setImagemLocal} />
            </Secao>

            <Secao numero={4} titulo="Localizacao">
              <GeolocalizacaoCaptura key={`geo-${resetKey}`} onCapturada={(lat, lng) => { setLatitude(lat); setLongitude(lng); }} />
            </Secao>

            {pendentes.length > 0 && (
              <div style={s.pendentesBox}>
                <p style={s.pendentesTitulo}>Pendente:</p>
                {pendentes.map((p) => <span key={p} style={s.pendenteItem}>{p}</span>)}
              </div>
            )}

            {estadoEnvio === 'erro' && mensagemErro && (
              <div style={s.erroCard}>
                <p style={{ margin: 0, fontWeight: 600, fontFamily: fonts.body }}>Erro ao enviar</p>
                <p style={{ margin: '4px 0 0', fontSize: '14px', fontFamily: fonts.body }}>{mensagemErro}</p>
              </div>
            )}

            <button
              type="button"
              onClick={handleEnviar}
              disabled={!formularioCompleto || estadoEnvio === 'enviando'}
              style={!formularioCompleto || estadoEnvio === 'enviando' ? s.btnDisabled : s.btnPrimario}
            >
              {estadoEnvio === 'enviando' ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <span style={s.spinner} /> Enviando...
                </span>
              ) : 'Enviar Entrega'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Secao({ numero, titulo, children }: { numero: number; titulo: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{
          width: '24px', height: '24px', borderRadius: '50%',
          backgroundColor: colors.accentLight, border: `1px solid ${colors.accentBorder}`,
          color: colors.accent, fontSize: '12px', fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: fonts.title, flexShrink: 0,
        }}>{numero}</span>
        <h2 style={{ fontSize: '15px', fontWeight: 600, color: colors.textPrimary, margin: 0, fontFamily: fonts.title }}>{titulo}</h2>
      </div>
      <div style={{ paddingLeft: '34px' }}>{children}</div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { maxWidth: '480px', margin: '0 auto', minHeight: '100dvh', backgroundColor: colors.bgPrimary, display: 'flex', flexDirection: 'column' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', backgroundColor: colors.bgCard, borderBottom: `1px solid ${colors.border}`, position: 'sticky', top: 0, zIndex: 10 },
  headerRight: { display: 'flex', alignItems: 'center', gap: '10px' },
  headerNome: { fontSize: '13px', color: colors.textSecondary, fontFamily: fonts.body },
  btnSair: { padding: '6px 12px', fontSize: '13px', borderRadius: radius.md, border: `1px solid ${colors.border}`, backgroundColor: 'transparent', color: colors.textSecondary, cursor: 'pointer', fontFamily: fonts.body },
  body: { padding: '20px 16px', flex: 1 },
  titulo: { fontSize: '20px', fontWeight: 700, color: colors.textPrimary, marginBottom: '24px', fontFamily: fonts.title },
  form: { display: 'flex', flexDirection: 'column', gap: '28px', paddingBottom: '32px' },
  sucessoCard: { backgroundColor: colors.bgCard, border: `1px solid ${colors.successBorder}`, borderRadius: radius.xl, padding: '2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' },
  sucessoIcone: { width: '56px', height: '56px', borderRadius: '50%', backgroundColor: colors.successBg, border: `2px solid ${colors.success}`, color: colors.success, fontSize: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 },
  sucessoTitulo: { fontSize: '18px', fontWeight: 700, color: colors.textPrimary, margin: 0, fontFamily: fonts.title },
  sucessoDesc: { fontSize: '14px', color: colors.textSecondary, margin: 0, fontFamily: fonts.body },
  pendentesBox: { display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '12px', backgroundColor: colors.bgCard, borderRadius: radius.md, border: `1px solid ${colors.border}`, alignItems: 'center' },
  pendentesTitulo: { fontSize: '12px', color: colors.textMuted, fontFamily: fonts.body, margin: 0, marginRight: '4px' },
  pendenteItem: { fontSize: '12px', color: colors.warning, backgroundColor: colors.warningBg, border: `1px solid ${colors.warningBorder}`, borderRadius: radius.full, padding: '2px 10px', fontFamily: fonts.body },
  erroCard: { padding: '12px', borderRadius: radius.md, backgroundColor: colors.errorBg, border: `1px solid ${colors.errorBorder}`, color: colors.error },
  btnPrimario: { padding: '14px 16px', fontSize: '16px', fontWeight: 600, borderRadius: radius.md, border: 'none', backgroundColor: colors.accent, color: '#fff', cursor: 'pointer', width: '100%', fontFamily: fonts.title },
  btnDisabled: { padding: '14px 16px', fontSize: '16px', fontWeight: 600, borderRadius: radius.md, border: 'none', backgroundColor: colors.textMuted, color: 'rgba(255,255,255,0.4)', cursor: 'not-allowed', width: '100%', fontFamily: fonts.title },
  spinner: { display: 'inline-block', width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
};
