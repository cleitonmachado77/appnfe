import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../constants';

interface Props {
  isOnline: boolean;
  pendingCount?: number;
}

export default function NetworkBanner({ isOnline, pendingCount = 0 }: Props) {
  if (isOnline && pendingCount === 0) return null;

  return (
    <View style={[s.banner, isOnline ? s.syncing : s.offline]}>
      <Text style={s.text}>
        {!isOnline
          ? '📡 Sem conexão — modo offline ativo'
          : `🔄 ${pendingCount} entrega(s) aguardando sincronização`}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  banner: { paddingVertical: 8, paddingHorizontal: 16, alignItems: 'center', borderRadius: 10 },
  offline: { backgroundColor: colors.warningBg, borderWidth: 1, borderColor: colors.warning },
  syncing: { backgroundColor: colors.accentLight, borderWidth: 1, borderColor: colors.accentBorder },
  text: { color: colors.textPrimary, fontSize: 12, fontWeight: '600' },
});
