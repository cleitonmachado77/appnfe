import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Image,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { colors } from '../constants';
import { useAuth } from '../hooks/useAuth';
import { useNetwork } from '../hooks/useNetwork';
import { useBadges } from '../hooks/useBadges';
import {
  apiUploadImagem, apiFinalizarEntrega,
  type EntregaResponse, type CampoImagemResponse,
} from '../api/client';
import { salvarEntregaOffline } from '../db/sync';

const CAMPOS_SEM_AUSENCIA = new Set(['CANHOTO', 'LOCAL']);

interface Props {
  entrega: EntregaResponse;
  campos: CampoImagemResponse[];
  onVoltar: () => void;
  onFinalizado: () => void;
}

export default function FinalizarEntregaScreen({ entrega, campos, onVoltar, onFinalizado }: Props) {
  const { token } = useAuth();
  const { isOnline } = useNetwork();
  const { refreshBadges } = useBadges();

  const jaEnviadas = new Set<string>(
    entrega.imagens.map((i) => i.campo_key ?? i.tipo ?? '').filter(Boolean),
  );
  const camposFaltando = campos.filter((c) => !jaEnviadas.has(c.key));
  const temLocalizacao = Number(entrega.latitude) !== 0 || Number(entrega.longitude) !== 0;

  const [imagens, setImagens] = useState<Record<string, string | null>>(() => {
    const r: Record<string, string | null> = {};
    camposFaltando.forEach((c) => { r[c.key] = null; });
    return r;
  });
  const [ausentes, setAusentes] = useState<Record<string, boolean>>(() => {
    const r: Record<string, boolean> = {};
    (entrega.campos_ausentes ?? []).forEach((k) => { r[k] = true; });
    return r;
  });
  const [latitude, setLatitude] = useState<number | null>(temLocalizacao ? Number(entrega.latitude) : null);
  const [longitude, setLongitude] = useState<number | null>(temLocalizacao ? Number(entrega.longitude) : null);
  const [obtendoLoc, setObtendoLoc] = useState(false);
  const [estado, setEstado] = useState<'idle' | 'enviando' | 'sucesso' | 'erro'>('idle');
  const [erro, setErro] = useState('');

  const camposObrigFaltando = camposFaltando.filter((c) => c.obrigatorio);
  const locOk = latitude !== null && longitude !== null;
  const podeFinalizar = camposObrigFaltando.every((c) => imagens[c.key] || ausentes[c.key]) && locOk;

  async function capturarFoto(campoKey: string) {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Habilite o acesso à câmera.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'], quality: 0.7, allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      setImagens((prev) => ({ ...prev, [campoKey]: result.assets[0].uri }));
      setAusentes((prev) => ({ ...prev, [campoKey]: false }));
    }
  }

  async function capturarLocalizacao() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Habilite o acesso à localização.');
      return;
    }
    setObtendoLoc(true);
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLatitude(loc.coords.latitude);
      setLongitude(loc.coords.longitude);
    } catch { Alert.alert('Erro', 'Não foi possível obter a localização.'); }
    finally { setObtendoLoc(false); }
  }

  async function handleFinalizar() {
    if (!token) return;
    setEstado('enviando'); setErro('');

    const camposComImg = camposFaltando.filter((c) => imagens[c.key]);
    const camposAusentesKeys = Object.entries(ausentes).filter(([, v]) => v).map(([k]) => k);

    // OFFLINE: salva localmente para sincronizar depois
    if (!isOnline) {
      try {
        const imagensParaOffline = camposComImg.map((c) => ({
          campo_key: c.key,
          file_uri: imagens[c.key]!,
        }));
        await salvarEntregaOffline(
          entrega.chave_nfe,
          latitude!,
          longitude!,
          'PENDENTE',
          imagensParaOffline,
          camposAusentesKeys.length ? camposAusentesKeys : undefined,
        );
        setEstado('sucesso');
      } catch (err) {
        setErro(err instanceof Error ? err.message : 'Erro ao salvar offline.');
        setEstado('erro');
      }
      return;
    }

    // ONLINE: envia direto
    try {
      const uploads = await Promise.all(
        camposComImg.map(async (c) => {
          const result = await apiUploadImagem(imagens[c.key]!, token);
          return { url_arquivo: result.url_arquivo, tipo: c.key };
        }),
      );
      await apiFinalizarEntrega(entrega.id, {
        imagens: uploads,
        latitude: latitude!,
        longitude: longitude!,
        campos_ausentes: camposAusentesKeys.length ? camposAusentesKeys : undefined,
      }, token);
      setEstado('sucesso');
      refreshBadges();
    } catch (err) {
      // Fallback: tenta salvar offline
      try {
        const imagensParaOffline = camposComImg.map((c) => ({
          campo_key: c.key,
          file_uri: imagens[c.key]!,
        }));
        await salvarEntregaOffline(
          entrega.chave_nfe,
          latitude!,
          longitude!,
          'PENDENTE',
          imagensParaOffline,
          camposAusentesKeys.length ? camposAusentesKeys : undefined,
        );
        setEstado('sucesso');
      } catch {
        setErro(err instanceof Error ? err.message : 'Erro ao finalizar.');
        setEstado('erro');
      }
    }
  }

  if (estado === 'sucesso') return (
    <View style={s.container}>
      <View style={s.sucessoCard}>
        <Text style={s.sucessoIcone}>✓</Text>
        <Text style={s.sucessoTitulo}>{isOnline ? 'Entrega finalizada!' : 'Salvo offline!'}</Text>
        <Text style={s.sucessoDesc}>
          {isOnline ? 'Comprovante enviado com sucesso.' : 'Será sincronizado quando a conexão voltar.'}
        </Text>
        <TouchableOpacity style={s.btn} onPress={onFinalizado}>
          <Text style={s.btnText}>Voltar às pendentes</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <TouchableOpacity onPress={onVoltar} style={s.voltarBtn}>
        <Text style={s.voltarText}>← Voltar</Text>
      </TouchableOpacity>

      <View style={s.infoCard}>
        <Text style={s.infoLabel}>Finalizando entrega</Text>
        {entrega.codigo && <Text style={s.codigoBadge}>{entrega.codigo}</Text>}
        <Text style={s.chave}>{entrega.chave_nfe}</Text>
        {entrega.comentario_reativacao && (
          <View style={s.reativacaoCard}>
            <Text style={s.reativacaoTitulo}>↺ Entrega reativada pelo administrador</Text>
            <Text style={s.reativacaoTexto}>{entrega.comentario_reativacao}</Text>
          </View>
        )}
        <Text style={s.infoFotos}>{entrega.imagens.length} foto(s) já enviada(s)</Text>
      </View>

      {camposFaltando.length > 0 ? (
        camposFaltando.map((campo) => (
          <View key={campo.key} style={s.section}>
            <Text style={s.sectionTitle}>{campo.label} {campo.obrigatorio ? '*' : ''}</Text>
            {imagens[campo.key] ? (
              <View style={{ gap: 8 }}>
                <Image source={{ uri: imagens[campo.key]! }} style={s.preview} />
                <TouchableOpacity style={s.btnSec} onPress={() => capturarFoto(campo.key)}>
                  <Text style={s.btnSecText}>Trocar foto</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={s.captureBtn} onPress={() => capturarFoto(campo.key)}>
                <Text style={{ fontSize: 28 }}>📷</Text>
                <Text style={{ fontSize: 14, color: colors.textSecondary }}>Tirar foto</Text>
              </TouchableOpacity>
            )}
            {campo.obrigatorio && !imagens[campo.key] && !CAMPOS_SEM_AUSENCIA.has(campo.key) && (
              <TouchableOpacity style={s.ausenteRow}
                onPress={() => setAusentes((prev) => ({ ...prev, [campo.key]: !prev[campo.key] }))}>
                <View style={[s.checkbox, ausentes[campo.key] && s.checkboxChecked]}>
                  {ausentes[campo.key] && <Text style={s.checkmark}>✓</Text>}
                </View>
                <Text style={s.ausenteText}>Este item não existe nesta entrega</Text>
              </TouchableOpacity>
            )}
          </View>
        ))
      ) : (
        <View style={s.section}>
          <Text style={s.allDone}>✓ Todas as fotos já foram enviadas</Text>
        </View>
      )}

      {/* Localização */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Localização</Text>
        {latitude !== null ? (
          <View>
            <Text style={s.locOk}>📍 Localização capturada</Text>
            <Text style={s.locCoords}>{latitude.toFixed(6)}, {longitude?.toFixed(6)}</Text>
            <TouchableOpacity style={s.btnSec} onPress={capturarLocalizacao}>
              <Text style={s.btnSecText}>Recapturar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={[s.captureBtn, obtendoLoc && s.captureBtnLoading]} onPress={capturarLocalizacao} disabled={obtendoLoc}>
            {obtendoLoc ? (
              <>
                <ActivityIndicator size="small" color={colors.accent} />
                <Text style={{ fontSize: 14, color: colors.textSecondary }}>Obtendo localização…</Text>
              </>
            ) : (
              <>
                <Text style={{ fontSize: 28 }}>📍</Text>
                <Text style={{ fontSize: 14, color: colors.textSecondary }}>Capturar localização</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {estado === 'erro' && !!erro && (
        <View style={s.erroCard}><Text style={s.erroText}>{erro}</Text></View>
      )}

      <TouchableOpacity
        style={[s.btn, (!podeFinalizar || estado === 'enviando') && s.btnDisabled]}
        onPress={handleFinalizar}
        disabled={!podeFinalizar || estado === 'enviando'}>
        {estado === 'enviando' ? <ActivityIndicator color={colors.white} />
          : <Text style={s.btnText}>{isOnline ? 'Finalizar Entrega' : 'Salvar Offline'}</Text>}
      </TouchableOpacity>

      {!isOnline && (
        <Text style={s.offlineHint}>Sem conexão. Será salvo offline e sincronizado depois.</Text>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  content: { padding: 16, paddingBottom: 40, gap: 16 },
  voltarBtn: { paddingVertical: 8 },
  voltarText: { color: colors.accent, fontSize: 14, fontWeight: '600' },
  infoCard: { backgroundColor: colors.bgCard, borderRadius: 14, padding: 14, gap: 4, borderWidth: 1, borderColor: colors.border },
  infoLabel: { fontSize: 12, color: colors.textMuted },
  codigoBadge: { fontSize: 14, fontWeight: '700', color: colors.accent },
  chave: { fontSize: 11, color: colors.textMuted, fontFamily: 'monospace' },
  reativacao: { fontSize: 12, color: colors.warning, fontStyle: 'italic', marginTop: 6, borderLeftWidth: 2, borderLeftColor: colors.warning, paddingLeft: 6 },
  reativacaoCard: { backgroundColor: colors.warningBg, borderRadius: 8, padding: 10, marginTop: 8, borderLeftWidth: 3, borderLeftColor: colors.warning },
  reativacaoTitulo: { fontSize: 12, fontWeight: '600', color: colors.warning },
  reativacaoTexto: { fontSize: 12, color: colors.textSecondary, fontStyle: 'italic', marginTop: 2 },
  infoFotos: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  section: { backgroundColor: colors.bgCard, borderRadius: 14, padding: 16, gap: 12, borderWidth: 1, borderColor: colors.border },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  allDone: { fontSize: 14, color: colors.success, fontWeight: '600' },
  captureBtn: {
    backgroundColor: colors.bgSecondary, borderRadius: 10, padding: 24,
    alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed',
  },
  captureBtnLoading: {
    borderColor: colors.accent, borderStyle: 'solid',
  },
  preview: { width: '100%', height: 200, borderRadius: 10 },
  ausenteRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkbox: { width: 22, height: 22, borderRadius: 4, borderWidth: 2, borderColor: colors.warning, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: colors.warning },
  checkmark: { color: colors.white, fontSize: 14, fontWeight: '700' },
  ausenteText: { fontSize: 13, color: colors.warning },
  locOk: { fontSize: 14, color: colors.success, fontWeight: '600' },
  locCoords: { fontSize: 12, color: colors.textMuted, fontFamily: 'monospace' },
  erroCard: { backgroundColor: colors.errorBg, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: colors.errorBorder },
  erroText: { color: colors.error, fontSize: 13 },
  btn: { backgroundColor: colors.accent, borderRadius: 10, padding: 16, alignItems: 'center', shadowColor: colors.accent, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: colors.white, fontSize: 16, fontWeight: '600' },
  btnSec: { backgroundColor: 'transparent', borderRadius: 10, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: colors.accent },
  btnSecText: { color: colors.accent, fontSize: 14, fontWeight: '600' },
  offlineHint: { fontSize: 13, color: colors.warning, textAlign: 'center' },
  sucessoCard: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 16 },
  sucessoIcone: { fontSize: 48, color: colors.success },
  sucessoTitulo: { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
  sucessoDesc: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
});
