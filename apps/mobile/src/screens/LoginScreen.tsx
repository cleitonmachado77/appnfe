import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { colors } from '../constants';
import { apiLogin } from '../api/client';
import { useAuth } from '../hooks/useAuth';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !senha) { setErro('Preencha todos os campos'); return; }
    setLoading(true);
    setErro('');
    try {
      const res = await apiLogin(email.trim().toLowerCase(), senha);
      if (res.perfil !== 'ENTREGADOR') {
        setErro('Este app é exclusivo para entregadores');
        return;
      }
      await login(res.token, res.perfil, res.nome);
    } catch {
      setErro('Email ou senha inválidos');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.card}>
        <View style={s.logoWrap}>
          <Image source={require('../../assets/icon.png')} style={s.logoImg} resizeMode="contain" />
        </View>
        <Text style={s.subtitle}>Acesso do Entregador</Text>

        <View style={s.fieldGroup}>
          <Text style={s.label}>EMAIL</Text>
          <TextInput
            style={s.input}
            placeholder="seu@email.com"
            placeholderTextColor={colors.textMuted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />
        </View>

        <View style={s.fieldGroup}>
          <Text style={s.label}>SENHA</Text>
          <TextInput
            style={s.input}
            placeholder="••••••••"
            placeholderTextColor={colors.textMuted}
            value={senha}
            onChangeText={setSenha}
            secureTextEntry
            editable={!loading}
          />
        </View>

        {!!erro && (
          <View style={s.erroBox}>
            <Text style={s.erroText}>⚠ {erro}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[s.btn, loading && s.btnDisabled]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.7}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={s.btnText}>Entrar</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
    backgroundColor: colors.bgPrimary,
  },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: 20,
    padding: 32,
    gap: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.6,
    shadowRadius: 60,
    elevation: 20,
  },
  logoWrap: { alignItems: 'center', marginBottom: 8 },
  logoImg: { width: 120, height: 120 },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  fieldGroup: { gap: 6 },
  label: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: colors.bgSecondary,
    borderRadius: 10,
    padding: 14,
    color: colors.textPrimary,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  erroBox: {
    padding: 12,
    backgroundColor: colors.errorBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.errorBorder,
  },
  erroText: { color: colors.error, fontSize: 14 },
  btn: {
    marginTop: 8,
    backgroundColor: colors.accent,
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  btnDisabled: {
    backgroundColor: colors.textMuted,
    shadowOpacity: 0,
  },
  btnText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
