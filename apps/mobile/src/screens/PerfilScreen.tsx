import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { colors } from '../constants';
import { useAuth } from '../hooks/useAuth';
import { useNetwork } from '../hooks/useNetwork';

export default function PerfilScreen() {
  const { nome, perfil, logout } = useAuth();
  const { isOnline } = useNetwork();

  function handleLogout() {
    Alert.alert('Sair', 'Deseja realmente sair?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: logout },
    ]);
  }

  return (
    <View style={s.container}>
      <View style={s.card}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{nome?.charAt(0).toUpperCase() ?? '?'}</Text>
        </View>
        <Text style={s.nome}>{nome ?? 'Entregador'}</Text>
        <Text style={s.perfil}>{perfil}</Text>
        <View style={s.statusRow}>
          <View style={[s.statusDot, isOnline ? s.online : s.offline]} />
          <Text style={s.statusText}>{isOnline ? 'Online' : 'Offline'}</Text>
        </View>
      </View>
      <TouchableOpacity style={s.btnSair} onPress={handleLogout}>
        <Text style={s.btnSairText}>Sair da conta</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary, padding: 24, gap: 24 },
  card: {
    backgroundColor: colors.bgCard, borderRadius: 20, padding: 24,
    alignItems: 'center', gap: 12, borderWidth: 1, borderColor: colors.border,
  },
  avatar: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 28, fontWeight: '700', color: colors.white },
  nome: { fontSize: 18, fontWeight: '600', color: colors.textPrimary },
  perfil: { fontSize: 13, color: colors.textSecondary },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  online: { backgroundColor: colors.success },
  offline: { backgroundColor: colors.error },
  statusText: { fontSize: 13, color: colors.textSecondary },
  btnSair: {
    backgroundColor: 'transparent', borderRadius: 10, padding: 16,
    alignItems: 'center', borderWidth: 1, borderColor: colors.error,
  },
  btnSairText: { color: colors.error, fontSize: 16, fontWeight: '600' },
});
