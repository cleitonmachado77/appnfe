import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, RefreshControl,
  StyleSheet, Alert,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { colors } from '../constants';
import { useAuth } from '../hooks/useAuth';
import { useNetwork } from '../hooks/useNetwork';
import {
  apiListarPendentes, apiExcluirPendente, apiFinalizarEntrega,
  apiListarCamposImagem,
  apiListarTransferenciasRecebidas, apiListarTransferenciasEnviadas,
  apiResponderTransferencia,
  type EntregaResponse, type TransferenciaResponse, type CampoImagemResponse,
} from '../api/client';
import {
  listarEntregasOffline, excluirEntregaOffline,
  obterEntregasCache, cachearEntregas,
  obterCamposImagemCache, cachearCamposImagem,
  type EntregaOffline,
} from '../db/sync';
import NetworkBanner from '../components/NetworkBanner';
import FinalizarEntregaScreen from './FinalizarEntregaScreen';
import TransferirScreen from './TransferirScreen';

export default function PendentesScreen() {
  const { token } = useAuth();
  const { isOnline } = useNetwork();
  const [pendentes, setPendentes] = useState<EntregaResponse[]>([]);
  const [offlineEntregas, setOfflineEntregas] = useState<EntregaOffline[]>([]);
  const [recebidas, setRecebidas] = useState<TransferenciaResponse[]>([]);
  const [enviadas, setEnviadas] = useState<TransferenciaResponse[]>([]);
  const [campos, setCampos] = useState<CampoImagemResponse[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [excluindo, setExcluindo] = useState<string | null>(null);
  const [respondendo, setRespondendo] = useState<string | null>(null);
  const [enviandoParcial, setEnviandoParcial] = useState<string | null>(null);
  const [selecionada, setSelecionada] = useState<EntregaResponse | null>(null);
  const [transferindo, setTransferindo] = useState<EntregaResponse | null>(null);
  const isFocused = useIsFocused();

  const carregar = useCallback(async () => {
    if (!token) return;
    const offline = await listarEntregasOffline();
    setOfflineEntregas(offline.filter((e) => !e.sincronizado));

    // Campos imagem
    if (isOnline) {
      try {
        const c = await apiListarCamposImagem(token);
        setCampos(c); await cachearCamposImagem(c);
      } catch { /* fallback */ }
    }
    const cached = await obterCamposImagemCache();
    if (cached.length > 0 && campos.length === 0) setCampos(cached);

    if (isOnline) {
      try {
        const p = await apiListarPendentes(token); setPendentes(p); await cachearEntregas(p);
        setRecebidas(await apiListarTransferenciasRecebidas(token));
        setEnviadas(await apiListarTransferenciasEnviadas(token));
      } catch {
        const c = await obterEntregasCache();
        setPendentes(c.filter((e) => e.status === 'PENDENTE'));
      }
    } else {
      const c = await obterEntregasCache();
      setPendentes(c.filter((e) => e.status === 'PENDENTE'));
    }
  }, [token, isOnline]);

  useEffect(() => { carregar(); }, [carregar]);

  // Recarrega quando a aba ganha foco
  useEffect(() => { if (isFocused) carregar(); }, [isFocused]);

  // Polling a cada 10s enquanto focado
  useEffect(() => {
    if (!isFocused || !isOnline) return;
    const interval = setInterval(carregar, 10_000);
    return () => clearInterval(interval);
  }, [isFocused, isOnline, carregar]);
  async function onRefresh() { setRefreshing(true); await carregar(); setRefreshing(false); }

  async function handleExcluirOnline(e: EntregaResponse) {
    if (!token) return;
    Alert.alert('Excluir', `Excluir entrega ${e.codigo ?? e.chave_nfe.slice(0, 10)}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: async () => {
        setExcluindo(e.id);
        try { await apiExcluirPendente(e.id, token); await carregar(); }
        catch { Alert.alert('Erro', 'Não foi possível excluir'); }
        finally { setExcluindo(null); }
      }},
    ]);
  }

  async function handleExcluirOffline(localId: string) {
    Alert.alert('Excluir', 'Excluir esta entrega offline?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: async () => {
        await excluirEntregaOffline(localId); await carregar();
      }},
    ]);
  }

  async function handleEnviarParcial(e: EntregaResponse) {
    if (!token || !isOnline) return;
    Alert.alert('Enviar Parcial', 'Enviar com as informações que já possui?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Enviar', onPress: async () => {
        setEnviandoParcial(e.id);
        try {
          await apiFinalizarEntrega(e.id, {
            imagens: [], latitude: Number(e.latitude) || 0,
            longitude: Number(e.longitude) || 0, parcial: true,
          }, token);
          await carregar();
        } catch { Alert.alert('Erro', 'Não foi possível enviar'); }
        finally { setEnviandoParcial(null); }
      }},
    ]);
  }

  async function handleResponder(id: string, acao: 'aceitar' | 'recusar') {
    if (!token || !isOnline) { Alert.alert('Sem conexão', 'Precisa estar online.'); return; }
    setRespondendo(id);
    try { await apiResponderTransferencia(id, acao, token); await carregar(); }
    catch { Alert.alert('Erro', `Não foi possível ${acao}`); }
    finally { setRespondendo(null); }
  }

  async function handleCancelarEnviada(id: string) {
    if (!token || !isOnline) return;
    try { await apiResponderTransferencia(id, 'cancelar', token); await carregar(); }
    catch { Alert.alert('Erro', 'Não foi possível cancelar'); }
  }

  // Sub-telas
  if (selecionada) return (
    <FinalizarEntregaScreen
      entrega={selecionada}
      campos={campos}
      onVoltar={() => setSelecionada(null)}
      onFinalizado={() => { setSelecionada(null); carregar(); }}
    />
  );

  if (transferindo) return (
    <TransferirScreen
      entrega={transferindo}
      onVoltar={() => setTransferindo(null)}
      onTransferido={() => { setTransferindo(null); carregar(); }}
    />
  );

  const totalPendentes = pendentes.length + offlineEntregas.length;

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}>
      <NetworkBanner isOnline={isOnline} pendingCount={offlineEntregas.length} />

      {/* Transferências recebidas */}
      {recebidas.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>📨 Transferências recebidas ({recebidas.length})</Text>
          {recebidas.map((t) => (
            <View key={t.id} style={s.transCard}>
              <View style={{ flex: 1 }}>
                <Text style={s.transNome}>De: {t.remetente?.nome ?? '—'}</Text>
                {t.entrega?.codigo && <Text style={s.codigoBadge}>{t.entrega.codigo}</Text>}
                {t.mensagem && <Text style={s.transMensagem}>"{t.mensagem}"</Text>}
              </View>
              <View style={{ gap: 6 }}>
                <TouchableOpacity style={s.btnAceitar} onPress={() => handleResponder(t.id, 'aceitar')} disabled={respondendo === t.id}>
                  <Text style={s.btnAceitarText}>Aceitar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.btnRecusar} onPress={() => handleResponder(t.id, 'recusar')} disabled={respondendo === t.id}>
                  <Text style={s.btnRecusarText}>Recusar</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Transferências enviadas */}
      {enviadas.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>📤 Aguardando resposta ({enviadas.length})</Text>
          {enviadas.map((t) => (
            <View key={t.id} style={[s.transCard, { opacity: 0.7 }]}>
              <View style={{ flex: 1 }}>
                <Text style={s.transNome}>Para: {t.destinatario?.nome ?? '—'}</Text>
                {t.entrega?.codigo && <Text style={s.codigoBadge}>{t.entrega.codigo}</Text>}
              </View>
              <TouchableOpacity style={s.btnRecusar} onPress={() => handleCancelarEnviada(t.id)}>
                <Text style={s.btnRecusarText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Entregas offline */}
      {offlineEntregas.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>📱 Salvas offline ({offlineEntregas.length})</Text>
          {offlineEntregas.map((e) => (
            <View key={e.local_id} style={s.card}>
              <View style={{ flex: 1 }}>
                <View style={s.cardHeader}>
                  <Text style={s.offlineBadge}>OFFLINE</Text>
                  <Text style={s.chaveResumo}>{e.chave_nfe.slice(0, 10)}…{e.chave_nfe.slice(-6)}</Text>
                </View>
                <Text style={s.cardData}>{new Date(e.criado_em).toLocaleString('pt-BR')}</Text>
              </View>
              <TouchableOpacity style={s.btnExcluir} onPress={() => handleExcluirOffline(e.local_id)}>
                <Text style={s.btnExcluirText}>Excluir</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Entregas pendentes do servidor */}
      {pendentes.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>📦 Pendentes ({pendentes.length})</Text>
          {pendentes.map((e) => {
            const emTransf = enviadas.some((t) => t.entrega_id === e.id);
            return (
              <View key={e.id} style={s.card}>
                <View style={{ flex: 1 }}>
                  <View style={s.cardHeader}>
                    {e.codigo && <Text style={s.codigoBadge}>{e.codigo}</Text>}
                    {emTransf && <Text style={s.tagTransf}>em transferência</Text>}
                  </View>
                  <Text style={s.chaveResumo}>{e.chave_nfe.slice(0, 10)}…{e.chave_nfe.slice(-6)}</Text>
                  <Text style={s.cardData}>{new Date(e.data_hora).toLocaleString('pt-BR')}</Text>
                  <Text style={s.cardInfo}>{e.imagens.length} foto{e.imagens.length !== 1 ? 's' : ''} já enviada{e.imagens.length !== 1 ? 's' : ''}</Text>
                  {e.comentario_reativacao && (
                    <Text style={s.reativacao}>"{e.comentario_reativacao}"</Text>
                  )}
                </View>
                <View style={{ gap: 6 }}>
                  {/* Retomar — sempre visível */}
                  <TouchableOpacity style={[s.btnRetomar, emTransf && s.btnDisabled]}
                    onPress={() => setSelecionada(e)} disabled={emTransf}>
                    <Text style={s.btnRetomarText}>Retomar →</Text>
                  </TouchableOpacity>
                  {/* Transferir — só online */}
                  <TouchableOpacity style={[s.btnTransferir, (emTransf || !isOnline) && s.btnDisabled]}
                    onPress={() => setTransferindo(e)} disabled={emTransf || !isOnline}>
                    <Text style={s.btnTransferirText}>Transferir</Text>
                  </TouchableOpacity>
                  {/* Parcial — só online */}
                  <TouchableOpacity style={[s.btnParcial, (enviandoParcial === e.id || emTransf || !isOnline) && s.btnDisabled]}
                    onPress={() => handleEnviarParcial(e)} disabled={enviandoParcial === e.id || emTransf || !isOnline}>
                    <Text style={s.btnParcialText}>{enviandoParcial === e.id ? '…' : 'Parcial'}</Text>
                  </TouchableOpacity>
                  {/* Excluir — NÃO aparece se entrega foi reativada */}
                  {!e.comentario_reativacao && (
                    <TouchableOpacity style={[s.btnExcluir, (excluindo === e.id || emTransf || !isOnline) && s.btnDisabled]}
                      onPress={() => handleExcluirOnline(e)} disabled={excluindo === e.id || emTransf || !isOnline}>
                      <Text style={s.btnExcluirText}>{excluindo === e.id ? '…' : 'Excluir'}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}

      {totalPendentes === 0 && recebidas.length === 0 && (
        <View style={s.vazio}>
          <Text style={{ fontSize: 40 }}>✅</Text>
          <Text style={s.vazioText}>Nenhuma entrega pendente.</Text>
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  content: { padding: 16, paddingBottom: 40, gap: 20 },
  section: { gap: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  card: { backgroundColor: colors.bgCard, borderRadius: 14, padding: 14, flexDirection: 'row', gap: 12, borderWidth: 1, borderColor: colors.border },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  codigoBadge: { backgroundColor: colors.accent, color: colors.white, fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' },
  offlineBadge: { backgroundColor: colors.warning, color: '#000', fontSize: 10, fontWeight: '700', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' },
  tagTransf: { backgroundColor: colors.warningBg, color: colors.warning, fontSize: 10, fontWeight: '600', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' },
  chaveResumo: { fontSize: 12, color: colors.textMuted, fontFamily: 'monospace' },
  cardData: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  cardInfo: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  reativacao: { fontSize: 12, color: colors.warning, fontStyle: 'italic', marginTop: 6, borderLeftWidth: 2, borderLeftColor: colors.warning, paddingLeft: 6 },
  transCard: { backgroundColor: colors.bgCard, borderRadius: 14, padding: 14, flexDirection: 'row', gap: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  transNome: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  transMensagem: { fontSize: 12, color: colors.textSecondary, fontStyle: 'italic', marginTop: 4 },
  btnRetomar: { backgroundColor: colors.accent, borderRadius: 6, paddingVertical: 8, paddingHorizontal: 14, alignItems: 'center' },
  btnRetomarText: { color: colors.white, fontSize: 12, fontWeight: '600' },
  btnTransferir: { backgroundColor: colors.bgSecondary, borderRadius: 6, paddingVertical: 8, paddingHorizontal: 14, alignItems: 'center', borderWidth: 1, borderColor: colors.accent },
  btnTransferirText: { color: colors.accent, fontSize: 12, fontWeight: '600' },
  btnAceitar: { backgroundColor: colors.success, borderRadius: 6, paddingVertical: 8, paddingHorizontal: 14, alignItems: 'center' },
  btnAceitarText: { color: colors.white, fontSize: 12, fontWeight: '600' },
  btnRecusar: { backgroundColor: 'transparent', borderRadius: 6, paddingVertical: 8, paddingHorizontal: 14, alignItems: 'center', borderWidth: 1, borderColor: colors.error },
  btnRecusarText: { color: colors.error, fontSize: 12, fontWeight: '600' },
  btnParcial: { backgroundColor: colors.warning, borderRadius: 6, paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center' },
  btnParcialText: { color: '#000', fontSize: 12, fontWeight: '600' },
  btnExcluir: { backgroundColor: 'transparent', borderRadius: 6, paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.error },
  btnExcluirText: { color: colors.error, fontSize: 12, fontWeight: '600' },
  btnDisabled: { opacity: 0.4 },
  vazio: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  vazioText: { fontSize: 14, color: colors.textSecondary },
});
