import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert,
} from 'react-native';
import { TextInput } from 'react-native';
import { colors } from '../constants';
import { useAuth } from '../hooks/useAuth';
import { useNetwork } from '../hooks/useNetwork';
import {
  apiListarColegas, apiSolicitarTransferencia,
  type EntregaResponse,
} from '../api/client';

interface Props {
  entrega: EntregaResponse;
  onVoltar: () => void;
  onTransferido: () => void;
}

export default function TransferirScreen({ entrega, onVoltar, onTransferido }: Props) {
  const { token } = useAuth();
  const { isOnline } = useNetwork();
  const [colegas, setColegas] = useState<{ id: string; nome: string }[]>([]);
  const [destinatarioId, setDestinatarioId] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!token || !isOnline) return;
    apiListarColegas(token).then(setColegas).catch(() => {});
  }, [token, isOnline]);

  async function handleEnviar() {
    if (!destinatarioId || !token) return;
    if (!isOnline) {
      Alert.alert('Sem conexão', 'Transferências só podem ser feitas online.');
      return;
    }
    setEnviando(true);
    try {
      await apiSolicitarTransferencia(entrega.id, destinatarioId, mensagem || undefined, token);
      onTransferido();
    } catch (err) {
      Alert.alert('Erro', err instanceof Error ? err.message : 'Erro ao transferir');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <View style={s.container}>
      <TouchableOpacity onPress={onVoltar} style={s.btnVoltar}>
        <Text style={s.btnVoltarText}>← Voltar</Text>
      </TouchableOpacity>

      <View style={s.card}>
        <Text style={s.label}>Transferindo entrega</Text>
        {entrega.codigo && <Text style={s.codigo}>{entrega.codigo}</Text>}
        <Text style={s.chave}>{entrega.chave_nfe}</Text>
      </View>

      {!isOnline ? (
        <View style={s.offlineMsg}>
          <Text style={s.offlineText}>
            📡 Transferências só estão disponíveis com conexão à internet.
          </Text>
        </View>
      ) : (
        <>
          <View style={s.field}>
            <Text style={s.fieldLabel}>Entregador destinatário</Text>
            {colegas.length === 0 ? (
              <Text style={s.empty}>Nenhum colega disponível.</Text>
            ) : (
              <View style={s.colegasList}>
                {colegas.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[s.colegaItem, destinatarioId === c.id && s.colegaItemSelected]}
                    onPress={() => setDestinatarioId(c.id)}
                  >
                    <Text style={[s.colegaText, destinatarioId === c.id && s.colegaTextSelected]}>
                      {c.nome}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={s.field}>
            <Text style={s.fieldLabel}>Mensagem (opcional)</Text>
            <TextInput
              style={s.textarea}
              value={mensagem}
              onChangeText={setMensagem}
              placeholder="Ex: Cliente não estava em casa…"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
            />
          </View>

          <TouchableOpacity
            style={[s.btn, (!destinatarioId || enviando) && s.btnDisabled]}
            onPress={handleEnviar}
            disabled={!destinatarioId || enviando}
          >
            {enviando ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={s.btnText}>Enviar Transferência</Text>
            )}
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary, padding: 16, gap: 16 },
  btnVoltar: { paddingVertical: 8 },
  btnVoltarText: { color: colors.accent, fontSize: 14, fontWeight: '600' },
  card: { backgroundColor: colors.bgCard, borderRadius: 14, padding: 14, gap: 4, borderWidth: 1, borderColor: colors.border },
  label: { fontSize: 12, color: colors.textMuted },
  codigo: { fontSize: 14, fontWeight: '700', color: colors.accent },
  chave: { fontSize: 11, color: colors.textMuted, fontFamily: 'monospace' },
  offlineMsg: { backgroundColor: colors.warningBg, borderRadius: 10, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: colors.warning },
  offlineText: { color: colors.warning, fontSize: 14, textAlign: 'center' },
  field: { gap: 8 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  empty: { fontSize: 13, color: colors.textMuted },
  colegasList: { gap: 6 },
  colegaItem: {
    backgroundColor: colors.bgSecondary, borderRadius: 10, padding: 14,
    borderWidth: 1, borderColor: colors.border,
  },
  colegaItemSelected: { borderColor: colors.accent, backgroundColor: colors.accentLight },
  colegaText: { color: colors.textPrimary, fontSize: 14 },
  colegaTextSelected: { color: colors.accent, fontWeight: '600' },
  textarea: {
    backgroundColor: colors.bgSecondary, borderRadius: 10, padding: 14,
    color: colors.textPrimary, fontSize: 14, borderWidth: 1, borderColor: colors.border,
    textAlignVertical: 'top', minHeight: 80,
  },
  btn: { backgroundColor: colors.accent, borderRadius: 10, padding: 16, alignItems: 'center' },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: colors.white, fontSize: 16, fontWeight: '600' },
});
