import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, StyleSheet } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { colors } from '../constants';
import { useAuth } from '../hooks/useAuth';
import { useNetwork } from '../hooks/useNetwork';
import { apiListarNotificacoes, apiMarcarTodasLidas, type NotificacaoResponse } from '../api/client';

export default function NotificacoesScreen() {
  const { token } = useAuth();
  const { isOnline } = useNetwork();
  const [notificacoes, setNotificacoes] = useState<NotificacaoResponse[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const isFocused = useIsFocused();

  const carregar = useCallback(async () => {
    if (!token || !isOnline) return;
    try {
      const lista = await apiListarNotificacoes(token);
      setNotificacoes(lista);
      // Marca todas como lidas ao abrir a aba
      await apiMarcarTodasLidas(token).catch(() => {});
    } catch { /* ignore */ }
  }, [token, isOnline]);

  useEffect(() => { carregar(); }, [carregar]);

  // Recarrega e marca como lidas quando a aba ganha foco
  useEffect(() => { if (isFocused) carregar(); }, [isFocused]);

  async function onRefresh() { setRefreshing(true); await carregar(); setRefreshing(false); }

  function getIcone(tipo: string) {
    if (tipo === 'REATIVACAO') return '↺';
    if (tipo === 'TRANSFERENCIA') return '↔';
    return '📦';
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}>
      {!isOnline && (
        <View style={s.offlineMsg}><Text style={s.offlineText}>Notificações disponíveis apenas online</Text></View>
      )}
      {notificacoes.length === 0 ? (
        <View style={s.vazio}>
          <Text style={{ fontSize: 40 }}>🔔</Text>
          <Text style={s.vazioText}>Nenhuma notificação.</Text>
        </View>
      ) : notificacoes.map((n) => (
        <View key={n.id} style={[s.card, n.lida && { opacity: 0.6 }]}>
          <Text style={{ fontSize: 20 }}>{getIcone(n.tipo)}</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.mensagem}>{n.mensagem}</Text>
            <Text style={s.data}>{new Date(n.criado_em).toLocaleString('pt-BR')}</Text>
          </View>
          {!n.lida && <View style={s.dot} />}
        </View>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  content: { padding: 16, paddingBottom: 40, gap: 10 },
  offlineMsg: { backgroundColor: colors.warningBg, borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.warning },
  offlineText: { color: colors.warning, fontSize: 13 },
  card: { backgroundColor: colors.bgCard, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: colors.border },
  mensagem: { fontSize: 13, color: colors.textPrimary },
  data: { fontSize: 11, color: colors.textMuted, marginTop: 3 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent },
  vazio: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  vazioText: { fontSize: 14, color: colors.textSecondary },
});
