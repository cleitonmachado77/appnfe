import { createContext, useContext } from 'react';
import * as SecureStore from 'expo-secure-store';

export interface AuthState {
  token: string | null;
  perfil: string | null;
  nome: string | null;
  isLoggedIn: boolean;
}

export interface AuthContextType extends AuthState {
  login: (token: string, perfil: string, nome: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  token: null,
  perfil: null,
  nome: null,
  isLoggedIn: false,
  login: async () => {},
  logout: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

// Helpers para acesso direto (fora de componentes)
export async function getAuthToken(): Promise<string | null> {
  return SecureStore.getItemAsync('token');
}

export async function saveAuth(token: string, perfil: string, nome: string) {
  await SecureStore.setItemAsync('token', token);
  await SecureStore.setItemAsync('perfil', perfil);
  await SecureStore.setItemAsync('nome', nome);
}

export async function clearAuth() {
  await SecureStore.deleteItemAsync('token');
  await SecureStore.deleteItemAsync('perfil');
  await SecureStore.deleteItemAsync('nome');
}

export async function loadAuth(): Promise<AuthState> {
  const token = await SecureStore.getItemAsync('token');
  const perfil = await SecureStore.getItemAsync('perfil');
  const nome = await SecureStore.getItemAsync('nome');
  return { token, perfil, nome, isLoggedIn: !!token };
}
