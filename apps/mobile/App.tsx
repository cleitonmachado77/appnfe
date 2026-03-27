import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StatusBar, AppState, Alert, Text, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';

import { AuthContext, AuthState, loadAuth, saveAuth, clearAuth } from './src/hooks/useAuth';
import { BadgesContext } from './src/hooks/useBadges';
import { sincronizarEntregasPendentes } from './src/db/sync';
import {
  apiListarPendentes, apiContarNaoLidas,
  apiListarTransferenciasRecebidas,
  apiListarCamposImagem,
} from './src/api/client';
import { cachearEntregas, cachearCamposImagem } from './src/db/sync';
import { colors } from './src/constants';

import LoginScreen from './src/screens/LoginScreen';
import NovaEntregaScreen from './src/screens/NovaEntregaScreen';
import PendentesScreen from './src/screens/PendentesScreen';
import NotificacoesScreen from './src/screens/NotificacoesScreen';
import PerfilScreen from './src/screens/PerfilScreen';

const Tab = createBottomTabNavigator();
const POLL_INTERVAL = 10_000;

export default function App() {
  const [auth, setAuth] = useState<AuthState>({
    token: null, perfil: null, nome: null, isLoggedIn: false,
  });
  const [loading, setLoading] = useState(true);
  const syncingRef = useRef(false);
  const [pendentesCount, setPendentesCount] = useState(0);
  const [naoLidasCount, setNaoLidasCount] = useState(0);
  const skipNotifPollRef = useRef(false);

  useEffect(() => {
    loadAuth().then((state) => { setAuth(state); setLoading(false); });
  }, []);

  const atualizarDados = useCallback(async () => {
    if (!auth.token) return;
    const netState = await NetInfo.fetch();
    if (!netState.isConnected || !netState.isInternetReachable) return;
    try {
      const [pendentes, recebidas, naoLidas] = await Promise.all([
        apiListarPendentes(auth.token).catch(() => []),
        apiListarTransferenciasRecebidas(auth.token).catch(() => []),
        apiContarNaoLidas(auth.token).catch(() => 0),
      ]);
      setPendentesCount(pendentes.length + recebidas.length);
      if (!skipNotifPollRef.current) {
        setNaoLidasCount(naoLidas);
      } else {
        skipNotifPollRef.current = false;
      }
      if (pendentes.length > 0) await cachearEntregas(pendentes).catch(() => {});
      const campos = await apiListarCamposImagem(auth.token).catch(() => null);
      if (campos) await cachearCamposImagem(campos).catch(() => {});
    } catch { /* ignore */ }
  }, [auth.token]);

  // Refresh instantâneo — chamado pelas telas após ações
  const refreshBadges = useCallback(() => {
    atualizarDados();
  }, [atualizarDados]);

  useEffect(() => {
    if (!auth.isLoggedIn) return;
    atualizarDados();
    const interval = setInterval(atualizarDados, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [auth.isLoggedIn, atualizarDados]);

  const syncPendentes = useCallback(async () => {
    if (syncingRef.current || !auth.token) return;
    syncingRef.current = true;
    try {
      const result = await sincronizarEntregasPendentes(auth.token);
      if (result.sucesso > 0) {
        Alert.alert('Sincronização', `${result.sucesso} entrega(s) sincronizada(s).`);
        atualizarDados();
      }
    } catch { /* ignore */ }
    finally { syncingRef.current = false; }
  }, [auth.token, atualizarDados]);

  useEffect(() => {
    if (!auth.isLoggedIn) return;
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable) syncPendentes();
    });
    return () => unsubscribe();
  }, [auth.isLoggedIn, syncPendentes]);

  useEffect(() => {
    if (!auth.isLoggedIn) return;
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') { syncPendentes(); atualizarDados(); }
    });
    return () => sub.remove();
  }, [auth.isLoggedIn, syncPendentes, atualizarDados]);

  const authContext = {
    ...auth,
    login: async (token: string, perfil: string, nome: string) => {
      await saveAuth(token, perfil, nome);
      setAuth({ token, perfil, nome, isLoggedIn: true });
    },
    logout: async () => {
      await clearAuth();
      setAuth({ token: null, perfil: null, nome: null, isLoggedIn: false });
      setPendentesCount(0); setNaoLidasCount(0);
    },
  };

  if (loading) return null;

  return (
    <SafeAreaProvider>
      <AuthContext.Provider value={authContext}>
        <BadgesContext.Provider value={{ refreshBadges }}>
          <StatusBar barStyle="light-content" backgroundColor={colors.bgPrimary} />
          <NavigationContainer>
            {!auth.isLoggedIn ? (
              <LoginScreen />
            ) : (
              <Tab.Navigator
                screenOptions={{
                  headerStyle: { backgroundColor: colors.bgCard },
                  headerTintColor: colors.textPrimary,
                  tabBarStyle: { backgroundColor: colors.bgCard, borderTopColor: colors.border },
                  tabBarActiveTintColor: colors.accent,
                  tabBarInactiveTintColor: colors.textMuted,
                }}
              >
                <Tab.Screen name="Nova" component={NovaEntregaScreen}
                  options={{ title: 'Nova Entrega', tabBarIcon: () => <TabIcon emoji="📦" /> }} />
                <Tab.Screen name="Pendentes" component={PendentesScreen}
                  options={{
                    title: 'Pendentes',
                    tabBarIcon: () => <TabIcon emoji="📋" />,
                    tabBarBadge: pendentesCount > 0 ? pendentesCount : undefined,
                    tabBarBadgeStyle: bs.badge,
                  }} />
                <Tab.Screen name="Notificacoes" component={NotificacoesScreen}
                  listeners={{ tabPress: () => { setNaoLidasCount(0); skipNotifPollRef.current = true; } }}
                  options={{
                    title: 'Notificações',
                    tabBarIcon: () => <TabIcon emoji="🔔" />,
                    tabBarBadge: naoLidasCount > 0 ? naoLidasCount : undefined,
                    tabBarBadgeStyle: bs.badge,
                  }} />
                <Tab.Screen name="Perfil" component={PerfilScreen}
                  options={{ title: 'Perfil', tabBarIcon: () => <TabIcon emoji="👤" /> }} />
              </Tab.Navigator>
            )}
          </NavigationContainer>
        </BadgesContext.Provider>
      </AuthContext.Provider>
    </SafeAreaProvider>
  );
}

function TabIcon({ emoji }: { emoji: string }) {
  return <Text style={{ fontSize: 20 }}>{emoji}</Text>;
}

const bs = StyleSheet.create({
  badge: { backgroundColor: colors.accent, fontSize: 10, fontWeight: '700' },
});
