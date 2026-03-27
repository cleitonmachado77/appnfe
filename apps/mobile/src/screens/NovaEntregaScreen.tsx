import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, ActivityIndicator, Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../constants';
import { useAuth } from '../hooks/useAuth';
import { useNetwork } from '../hooks/useNetwork';
import { useBadges } from '../hooks/useBadges';
import {
  apiUploadImagem, apiCriarEntrega, apiListarCamposImagem,
  type CampoImagemResponse,
} from '../api/client';
import {
  salvarEntregaOffline, cachearCamposImagem, obterCamposImagemCache,
} from '../db/sync';
import NetworkBanner from '../components/NetworkBanner';
import LeitorNFe from '../components/LeitorNFe';

const CAMPOS_SEM_AUSENCIA = new Set(['CANHOTO', 'LOCAL']);

export default function NovaEntregaScreen() {
  const { token } = useAuth();
  const { isOnline } = useNetwork();
  const { refreshBadges } = useBadges();
  const [campos, setCampos] = useState<CampoImagemResponse[]>([]);
  const [chaveNfe, setChaveNfe] = useState('');
  const [imagens, setImagens] = useState<Record<string, string | null>>({});
  const [ausentes, setAusentes] = useState<Record<string, boolean>>({});
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [obtendoLoc, setObtendoLoc] = useState(false);
  const [estado, setEstado] = useState<'idle' | 'enviando' | 'sucesso' | 'erro'>('idle');
  const [erro, setErro] = useState('');

  // Carrega campos toda vez que a tela ganha foco — sem memoização
  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        if (isOnline && token) {
          try {
            const c = await apiListarCamposImagem(token);
            if (active) { setCampos(c); await cachearCamposImagem(c); }
            return;
          } catch { /* fallback */ }
        }
        const cached = await obterCamposImagemCache();
        if (active && cached.length > 0) { setCampos(cached); return; }
        if (active) setCampos([
          { id: 'c', key: 'CANHOTO', label: 'Foto do Canhoto', obrigatorio: true, ordem: 0, ativo: true },
          { id: 'l', key: 'LOCAL', label: 'Foto do Local de Entrega', obrigatorio: true, ordem: 1, ativo: true },
        ]);
      })();
      return () => { active = false; };
    }, [token, isOnline])
  );

  // Também recarrega via intervalo enquanto online
  useEffect(() => {
    if (!isOnline || !token) return;
    const id = setInterval(async () => {
      try {
        const c = await apiListarCamposImagem(token);
        setCampos(c);
        await cachearCamposImagem(c);
      } catch { /* ignore */ }
    }, 15_000);
    return () => clearInterval(id);
  }, [isOnline, token]);

  async function capturarFoto(campoKey: string) {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Habilite o acesso à câmera nas configurações.');
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

  function limpar() {
    setChaveNfe('');
    const r: Record<string, string | null> = {};
    campos.forEach((c) => { r[c.key] = null; });
    setImagens(r); setAusentes({});
    setLatitude(null); setLongitude(null);
    setEstado('idle'); setErro('');
  }

  const camposObrig = campos.filter((c) => c.obrigatorio);
  const camposObrigOk = camposObrig.every((c) => imagens[c.key] || ausentes[c.key]);
  const podeEnviar = chaveNfe.length === 44 && camposObrigOk && latitude !== null;
  const podeSalvarPendente = chaveNfe.length === 44;

  async function enviar(salvarPendente: boolean) {
    if (!token) return;
    setEstado('enviando'); setErro('');
    const camposAusentesKeys = Object.entries(ausentes).filter(([, v]) => v).map(([k]) => k);
    const imagensParaEnviar = campos.filter((c) => imagens[c.key]).map((c) => ({
      campo_key: c.key, file_uri: imagens[c.key]!,
    }));

    // OFFLINE: salva localmente
    if (!isOnline) {
      try {
        await salvarEntregaOffline(chaveNfe, latitude ?? 0, longitude ?? 0,
          'PENDENTE', imagensParaEnviar,
          camposAusentesKeys.length ? camposAusentesKeys : undefined);
        setEstado('sucesso');
      } catch (err) {
        console.warn('Erro ao salvar offline:', err);
        setErro(err instanceof Error ? err.message : 'Erro ao salvar localmente. Tente novamente.');
        setEstado('erro');
      }
      return;
    }

    // ONLINE: envia pra API (igual ao web)
    try {
      const uploads = await Promise.all(
        imagensParaEnviar.map(async (img) => {
          const result = await apiUploadImagem(img.file_uri, token);
          return { url_arquivo: result.url_arquivo, tipo: img.campo_key };
        }),
      );
      await apiCriarEntrega({
        chave_nfe: chaveNfe, latitude: latitude ?? 0, longitude: longitude ?? 0,
        imagens: uploads,
        status: salvarPendente ? 'PENDENTE' : 'ENVIADO',
        campos_ausentes: camposAusentesKeys.length ? camposAusentesKeys : undefined,
      }, token);
      setEstado('sucesso');
      refreshBadges();
    } catch (apiErr) {
      // Falhou online? Salva offline como fallback
      console.warn('Falha ao enviar online, salvando offline:', apiErr);
      try {
        await salvarEntregaOffline(chaveNfe, latitude ?? 0, longitude ?? 0,
          salvarPendente ? 'PENDENTE' : 'ENVIADO', imagensParaEnviar,
          camposAusentesKeys.length ? camposAusentesKeys : undefined);
        Alert.alert('Salvo offline', 'Será sincronizado quando a conexão voltar.');
        setEstado('sucesso');
      } catch (offlineErr) {
        console.warn('Erro ao salvar offline:', offlineErr);
        setErro(
          apiErr instanceof Error
            ? `Falha no envio: ${apiErr.message}. Também não foi possível salvar offline.`
            : 'Erro ao enviar e ao salvar offline',
        );
        setEstado('erro');
      }
    }
  }

  if (estado === 'sucesso') return (
    <View style={s.container}>
      <View style={s.sucessoCard}>
        <Text style={s.sucessoIcone}>✓</Text>
        <Text style={s.sucessoTitulo}>{isOnline ? 'Entrega registrada!' : 'Salvo offline!'}</Text>
        <Text style={s.sucessoDesc}>
          {isOnline ? 'O comprovante está disponível para o gestor.' : 'Será sincronizado quando a conexão voltar.'}
        </Text>
        <TouchableOpacity style={s.btn} onPress={limpar}>
          <Text style={s.btnText}>Registrar nova entrega</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <NetworkBanner isOnline={isOnline} />

      <View style={s.section}>
        <Text style={s.sectionTitle}>1. Chave NF-e</Text>
        <LeitorNFe onChaveCapturada={setChaveNfe} valorInicial={chaveNfe} />
      </View>

      {campos.map((campo, idx) => (
        <View key={campo.key} style={s.section}>
          <Text style={s.sectionTitle}>{idx + 2}. {campo.label}</Text>
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
      ))}

      <View style={s.section}>
        <Text style={s.sectionTitle}>{campos.length + 2}. Localização</Text>
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

      <View style={{ gap: 12 }}>
        {isOnline ? (
          <>
            <TouchableOpacity style={[s.btn, (!podeEnviar || estado === 'enviando') && s.btnDisabled]}
              onPress={() => enviar(false)} disabled={!podeEnviar || estado === 'enviando'}>
              {estado === 'enviando' ? <ActivityIndicator color={colors.white} />
                : <Text style={s.btnText}>Enviar Entrega</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={[s.btnSec, (!podeSalvarPendente || estado === 'enviando') && s.btnDisabled]}
              onPress={() => enviar(true)} disabled={!podeSalvarPendente || estado === 'enviando'}>
              <Text style={s.btnSecText}>Salvar como Pendente</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={[s.btn, (!podeSalvarPendente || estado === 'enviando') && s.btnDisabled]}
            onPress={() => enviar(true)} disabled={!podeSalvarPendente || estado === 'enviando'}>
            {estado === 'enviando' ? <ActivityIndicator color={colors.white} />
              : <Text style={s.btnText}>Salvar Offline (Pendente)</Text>}
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  content: { padding: 16, paddingBottom: 40, gap: 20 },
  section: { backgroundColor: colors.bgCard, borderRadius: 14, padding: 16, gap: 12, borderWidth: 1, borderColor: colors.border },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  input: {
    backgroundColor: colors.bgSecondary, borderRadius: 10, padding: 14,
    color: colors.textPrimary, fontSize: 16, borderWidth: 1, borderColor: colors.border,
  },
  hint: { fontSize: 12, color: colors.textMuted },
  captureBtn: {
    backgroundColor: colors.bgSecondary, borderRadius: 10, padding: 24,
    alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed',
  },
  captureBtnLoading: {
    borderColor: colors.accent, borderStyle: 'solid',
  },
  preview: { width: '100%', height: 200, borderRadius: 10 },
  ausenteRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkbox: {
    width: 22, height: 22, borderRadius: 4, borderWidth: 2,
    borderColor: colors.warning, alignItems: 'center', justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: colors.warning },
  checkmark: { color: colors.white, fontSize: 14, fontWeight: '700' },
  ausenteText: { fontSize: 13, color: colors.warning },
  locOk: { fontSize: 14, color: colors.success, fontWeight: '600' },
  locCoords: { fontSize: 12, color: colors.textMuted, fontFamily: 'monospace' },
  erroCard: { backgroundColor: colors.errorBg, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: colors.errorBorder },
  erroText: { color: colors.error, fontSize: 13 },
  btn: { backgroundColor: colors.accent, borderRadius: 10, padding: 16, alignItems: 'center',
    shadowColor: colors.accent, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: colors.white, fontSize: 16, fontWeight: '600' },
  btnSec: {
    backgroundColor: 'transparent', borderRadius: 10, padding: 14,
    alignItems: 'center', borderWidth: 1, borderColor: colors.accent,
  },
  btnSecText: { color: colors.accent, fontSize: 14, fontWeight: '600' },
  sucessoCard: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 16 },
  sucessoIcone: { fontSize: 48, color: colors.success },
  sucessoTitulo: { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
  sucessoDesc: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
});
