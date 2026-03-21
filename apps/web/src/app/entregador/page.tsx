'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import LeitorNFe from '@/components/LeitorNFe';
import CapturaImagem from '@/components/CapturaImagem';
import GeolocalizacaoCaptura from '@/components/GeolocalizacaoCaptura';
import {
  getToken,
  clearToken,
  uploadImagem,
  criarEntrega,
} from '@/lib/api';

type EstadoEnvio = 'idle' | 'enviando' | 'sucesso' | 'erro';

// Chave usada para forçar remontagem dos componentes ao limpar o formulário
let contadorReset = 0;

export default function EntregadorPage() {
  const router = useRouter();
  const [nomeUsuario, setNomeUsuario] = useState('');

  // Campos do formulário
  const [chaveNfe, setChaveNfe] = useState('');
  const [imagemCanhoto, setImagemCanhoto] = useState<File | null>(null);
  const [imagemLocal, setImagemLocal] = useState<File | null>(null);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  // Estado do envio
  const [estadoEnvio, setEstadoEnvio] = useState<EstadoEnvio>('idle');
  const [mensagemErro, setMensagemErro] = useState('');

  // Chave de reset para forçar remontagem dos componentes
  const [resetKey, setResetKey] = useState(0);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }
    const nome = localStorage.getItem('nome') ?? 'Entregador';
    setNomeUsuario(nome);
  }, [router]);

  function handleLogout() {
    clearToken();
    router.replace('/login');
  }

  function limparFormulario() {
    contadorReset += 1;
    setChaveNfe('');
    setImagemCanhoto(null);
    setImagemLocal(null);
    setLatitude(null);
    setLongitude(null);
    setEstadoEnvio('idle');
    setMensagemErro('');
    setResetKey(contadorReset);
  }

  const formularioCompleto =
    chaveNfe.length === 44 &&
    imagemCanhoto !== null &&
    imagemLocal !== null &&
    latitude !== null &&
    longitude !== null;

  async function handleEnviar() {
    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    setEstadoEnvio('enviando');
    setMensagemErro('');

    try {
      // Upload das 2 imagens em paralelo
      const [resultCanhoto, resultLocal] = await Promise.all([
        uploadImagem(imagemCanhoto!, token),
        uploadImagem(imagemLocal!, token),
      ]);

      // Criar entrega com as URLs retornadas
      await criarEntrega(
        {
          chave_nfe: chaveNfe,
          latitude: latitude!,
          longitude: longitude!,
          imagens: [
            { url_arquivo: resultCanhoto.url_arquivo, tipo: 'CANHOTO' },
            { url_arquivo: resultLocal.url_arquivo, tipo: 'LOCAL' },
          ],
        },
        token,
      );

      setEstadoEnvio('sucesso');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro inesperado. Tente novamente.';
      setMensagemErro(msg);
      setEstadoEnvio('erro');
    }
  }

  return (
    <div
      style={{
        maxWidth: '480px',
        margin: '0 auto',
        padding: '16px',
        fontFamily: 'system-ui, sans-serif',
        minHeight: '100dvh',
        backgroundColor: '#f9fafb',
      }}
    >
      {/* Cabeçalho */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          paddingBottom: '12px',
          borderBottom: '1px solid #e5e7eb',
        }}
      >
        <div>
          <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>Olá,</p>
          <p style={{ margin: 0, fontWeight: 700, fontSize: '16px', color: '#111827' }}>
            {nomeUsuario}
          </p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          style={{
            padding: '8px 14px',
            fontSize: '14px',
            borderRadius: '8px',
            border: '1px solid #d1d5db',
            backgroundColor: '#fff',
            color: '#374151',
            cursor: 'pointer',
          }}
        >
          Sair
        </button>
      </div>

      <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', marginBottom: '24px' }}>
        Nova Entrega
      </h1>

      {/* Mensagem de sucesso */}
      {estadoEnvio === 'sucesso' && (
        <div
          style={{
            padding: '16px',
            borderRadius: '8px',
            backgroundColor: '#dcfce7',
            border: '1px solid #16a34a',
            color: '#15803d',
            marginBottom: '24px',
          }}
        >
          <p style={{ margin: '0 0 8px', fontWeight: 700, fontSize: '16px' }}>
            ✓ Entrega registrada com sucesso!
          </p>
          <p style={{ margin: '0 0 12px', fontSize: '14px' }}>
            O comprovante foi enviado e está disponível para o gestor.
          </p>
          <button
            type="button"
            onClick={limparFormulario}
            style={{
              padding: '10px 16px',
              fontSize: '15px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#16a34a',
              color: '#fff',
              cursor: 'pointer',
              width: '100%',
            }}
          >
            Registrar nova entrega
          </button>
        </div>
      )}

      {/* Formulário — oculto após sucesso */}
      {estadoEnvio !== 'sucesso' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Seção: Chave NF-e */}
          <section>
            <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#374151', marginBottom: '12px' }}>
              1. Chave NF-e
            </h2>
            <LeitorNFe
              key={`nfe-${resetKey}`}
              onChaveCapturada={(chave) => setChaveNfe(chave)}
            />
          </section>

          {/* Seção: Foto do Canhoto */}
          <section>
            <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#374151', marginBottom: '12px' }}>
              2. Foto do Canhoto
            </h2>
            <CapturaImagem
              key={`canhoto-${resetKey}`}
              tipo="CANHOTO"
              label="Foto do canhoto assinado"
              onImagemSelecionada={(file) => setImagemCanhoto(file)}
            />
          </section>

          {/* Seção: Foto do Local */}
          <section>
            <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#374151', marginBottom: '12px' }}>
              3. Foto do Local de Entrega
            </h2>
            <CapturaImagem
              key={`local-${resetKey}`}
              tipo="LOCAL"
              label="Foto do local de entrega"
              onImagemSelecionada={(file) => setImagemLocal(file)}
            />
          </section>

          {/* Seção: Geolocalização */}
          <section>
            <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#374151', marginBottom: '12px' }}>
              4. Localização
            </h2>
            <GeolocalizacaoCaptura
              key={`geo-${resetKey}`}
              onCapturada={(lat, lng) => {
                setLatitude(lat);
                setLongitude(lng);
              }}
            />
          </section>

          {/* Indicador de campos pendentes */}
          {!formularioCompleto && (
            <ul
              style={{
                margin: 0,
                padding: '12px 16px',
                borderRadius: '8px',
                backgroundColor: '#f3f4f6',
                border: '1px solid #e5e7eb',
                color: '#6b7280',
                fontSize: '13px',
                listStyle: 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              {chaveNfe.length !== 44 && <li>• Chave NF-e não confirmada</li>}
              {!imagemCanhoto && <li>• Foto do canhoto não selecionada</li>}
              {!imagemLocal && <li>• Foto do local não selecionada</li>}
              {latitude === null && <li>• Localização não capturada</li>}
            </ul>
          )}

          {/* Mensagem de erro */}
          {estadoEnvio === 'erro' && mensagemErro && (
            <div
              style={{
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: '#fef2f2',
                border: '1px solid #dc2626',
                color: '#b91c1c',
                fontSize: '14px',
              }}
            >
              <p style={{ margin: 0, fontWeight: 600 }}>Erro ao enviar entrega</p>
              <p style={{ margin: '4px 0 0' }}>{mensagemErro}</p>
            </div>
          )}

          {/* Botão de envio */}
          <button
            type="button"
            onClick={handleEnviar}
            disabled={!formularioCompleto || estadoEnvio === 'enviando'}
            style={{
              padding: '14px 16px',
              fontSize: '17px',
              fontWeight: 600,
              borderRadius: '8px',
              border: 'none',
              backgroundColor:
                !formularioCompleto || estadoEnvio === 'enviando' ? '#9ca3af' : '#2563eb',
              color: '#fff',
              cursor:
                !formularioCompleto || estadoEnvio === 'enviando' ? 'not-allowed' : 'pointer',
              width: '100%',
              marginBottom: '32px',
            }}
          >
            {estadoEnvio === 'enviando' ? 'Enviando…' : 'Enviar Entrega'}
          </button>
        </div>
      )}
    </div>
  );
}
