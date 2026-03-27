# ADD+ Entregas - App Mobile

App React Native (Expo) para entregadores com suporte offline.

## Setup

```bash
cd apps/mobile
npm install
```

## Desenvolvimento

```bash
npx expo start
```

- Pressione `a` para abrir no emulador Android
- Pressione `i` para abrir no simulador iOS
- Escaneie o QR code com o app Expo Go no celular

## Configuração da API

Edite `src/constants.ts` para apontar para sua API:
- Dev: `http://10.0.2.2:3001` (Android emulator)
- Dev iOS: `http://localhost:3001`
- Produção: sua URL de produção

## Assets

Coloque os ícones em `assets/`:
- `icon.png` (1024x1024)
- `splash.png` (1284x2778)  
- `adaptive-icon.png` (1024x1024)

## Build

```bash
# Instalar EAS CLI
npm install -g eas-cli

# Login no Expo
eas login

# Build APK (Android)
eas build --platform android --profile preview

# Build produção
eas build --platform android --profile production
eas build --platform ios --profile production
```

## Funcionalidades

- Login com mesmas credenciais do sistema web
- Criar entregas (online e offline)
- Captura de fotos via câmera
- Captura de GPS
- Salvar como pendente
- Sincronização automática quando conexão volta
- Transferir entregas (apenas online)
- Notificações
- Envio parcial de entregas
