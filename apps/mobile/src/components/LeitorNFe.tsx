import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Modal,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { colors } from '../constants';

const CHAVE_REGEX = /\d{44}/;

interface Props {
  onChaveCapturada: (chave: string) => void;
  valorInicial?: string;
}

export default function LeitorNFe({ onChaveCapturada, valorInicial = '' }: Props) {
  const [chave, setChave] = useState(valorInicial);
  const [scannerAberto, setScannerAberto] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const processandoRef = useRef(false);

  function handleChangeText(text: string) {
    const digits = text.replace(/\D/g, '').slice(0, 44);
    setChave(digits);
    if (digits.length === 44) onChaveCapturada(digits);
  }

  async function abrirScanner() {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) return;
    }
    processandoRef.current = false;
    setScannerAberto(true);
  }

  function handleBarCodeScanned({ data }: { data: string }) {
    if (processandoRef.current) return;
    const match = data.match(CHAVE_REGEX);
    if (match) {
      processandoRef.current = true;
      const chaveExtraida = match[0];
      setChave(chaveExtraida);
      onChaveCapturada(chaveExtraida);
      setScannerAberto(false);
    }
  }

  return (
    <View style={s.container}>
      <TextInput
        style={s.input}
        placeholder="Digite os 44 dígitos da chave NF-e"
        placeholderTextColor={colors.textMuted}
        value={chave}
        onChangeText={handleChangeText}
        keyboardType="numeric"
        maxLength={44}
      />

      <View style={s.row}>
        <Text style={s.hint}>{chave.length}/44 dígitos</Text>
        <TouchableOpacity style={s.scanBtn} onPress={abrirScanner}>
          <Text style={s.scanBtnText}>📷 Escanear código</Text>
        </TouchableOpacity>
      </View>

      {chave.length === 44 && (
        <View style={s.okBadge}>
          <Text style={s.okText}>✓ Chave válida</Text>
        </View>
      )}

      <Modal visible={scannerAberto} animationType="slide" onRequestClose={() => setScannerAberto(false)}>
        <View style={s.scannerContainer}>
          <CameraView
            style={s.camera}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['code128', 'code39', 'ean13', 'ean8', 'itf14', 'qr'] }}
            onBarcodeScanned={handleBarCodeScanned}
          />
          <View style={s.scannerOverlay}>
            <Text style={s.scannerTitle}>Aponte para o código de barras da NF-e</Text>
            <View style={s.scannerFrame} />
            <TouchableOpacity style={s.scannerClose} onPress={() => setScannerAberto(false)}>
              <Text style={s.scannerCloseText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { gap: 8 },
  input: {
    backgroundColor: colors.bgSecondary, borderRadius: 10, padding: 14,
    color: colors.textPrimary, fontSize: 16, borderWidth: 1, borderColor: colors.border,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  hint: { fontSize: 12, color: colors.textMuted },
  scanBtn: {
    backgroundColor: colors.accentLight, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12,
    borderWidth: 1, borderColor: colors.accentBorder,
  },
  scanBtnText: { color: colors.accent, fontSize: 13, fontWeight: '600' },
  okBadge: {
    backgroundColor: colors.successBg, borderRadius: 8, padding: 8, alignItems: 'center',
    borderWidth: 1, borderColor: colors.accent,
  },
  okText: { color: colors.success, fontSize: 13, fontWeight: '600' },
  scannerContainer: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  scannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center', alignItems: 'center', gap: 24,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  scannerTitle: { color: colors.white, fontSize: 16, fontWeight: '600', textAlign: 'center' },
  scannerFrame: {
    width: 280, height: 120, borderWidth: 2, borderColor: colors.accent,
    borderRadius: 12, backgroundColor: 'transparent',
  },
  scannerClose: {
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 10, paddingVertical: 14, paddingHorizontal: 32,
    borderWidth: 1, borderColor: colors.border,
  },
  scannerCloseText: { color: colors.white, fontSize: 16, fontWeight: '600' },
});
