# Plano de Implementação: nfe-delivery-proof

## Visão Geral

Implementação incremental do SaaS de Comprovação Digital de Recebimento de NF-e em TypeScript, utilizando NestJS no backend, Next.js no frontend (PWA + Admin) e PostgreSQL como banco de dados. Cada tarefa constrói sobre a anterior, terminando com a integração completa dos módulos.

---

## Tarefas

- [x] 1. Configurar estrutura do projeto e infraestrutura base
  - Criar monorepo com workspaces: `apps/api` (NestJS), `apps/web` (Next.js), `packages/shared` (tipos compartilhados)
  - Configurar `tsconfig.json` base e por workspace
  - Configurar Docker Compose com PostgreSQL para desenvolvimento local (ou usar Supabase diretamente)
  - Criar arquivo `.env.example` com todas as variáveis necessárias (DATABASE_URL do Supabase, JWT_SECRET, SUPABASE_URL, SUPABASE_KEY, S3_BUCKET, etc.)
  - Instalar dependências base: `@nestjs/core`, `@nestjs/typeorm`, `typeorm`, `pg`, `bcrypt`, `@nestjs/jwt`, `passport-jwt`, `@supabase/supabase-js`
  - _Requisitos: 1.1, 1.5, 3.1_

- [ ] 2. Implementar modelos de dados e migrations
  - [x] 2.1 Criar entidades TypeORM: `Usuario`, `Entrega`, `Imagem` com todos os campos do schema PostgreSQL
    - Incluir enums `PerfilUsuario`, `StatusEntrega`, `TipoImagem`
    - Configurar relacionamentos: `Usuario` 1→N `Entrega`, `Entrega` 1→N `Imagem`
    - _Requisitos: 1.1, 3.1, 4.4_
  - [-] 2.2 Escrever teste de propriedade para integridade dos modelos
    - **Propriedade 3: Entrega válida sempre é persistida com timestamp do servidor**
    - **Valida: Requisitos 3.1, 3.5**
  - [x] 2.3 Criar migration inicial com o schema completo (tabelas, índices, enums)
    - _Requisitos: 7.1_

- [ ] 3. Implementar módulo de autenticação (Auth)
  - [x] 3.1 Criar `AuthModule` com `AuthService` e `AuthController`
    - Implementar `POST /auth/login`: buscar usuário por email, comparar senha com bcrypt, gerar JWT com payload `{ sub, perfil }` e expiração de 8h
    - Retornar mensagem genérica em caso de falha (não revelar qual campo está errado)
    - _Requisitos: 1.1, 1.2_
  - [ ] 3.2 Escrever teste de propriedade para autenticação
    - **Propriedade 1: Autenticação com credenciais válidas sempre retorna JWT**
    - **Valida: Requisitos 1.1, 1.4**
  - [ ] 3.3 Escrever teste de propriedade para rejeição de credenciais inválidas
    - **Propriedade 2: Credenciais inválidas nunca retornam token**
    - **Valida: Requisitos 1.2**
  - [x] 3.4 Implementar `JwtStrategy` (passport-jwt) e `JwtAuthGuard` para proteger rotas
    - Validar token em cada requisição e injetar usuário no contexto
    - Retornar 401 para tokens ausentes ou expirados
    - _Requisitos: 1.3, 9.3_
  - [ ] 3.5 Escrever teste de propriedade para hash de senha
    - **Propriedade 11: Hash de senha é irreversível no banco**
    - **Valida: Requisitos 1.5**

- [ ] 4. Implementar controle de acesso por perfil (RBAC)
  - [x] 4.1 Criar decorator `@Roles()` e `RolesGuard` que extrai o perfil do JWT e valida contra os perfis permitidos na rota
    - Retornar 403 quando o perfil não tem permissão
    - _Requisitos: 9.1, 9.2, 9.4_
  - [ ] 4.2 Escrever teste de propriedade para bloqueio de ENTREGADOR em rotas ADMIN
    - **Propriedade 8: ENTREGADOR bloqueado em rotas ADMIN**
    - **Valida: Requisitos 9.1**
  - [ ] 4.3 Escrever teste de propriedade para bloqueio de ADMIN em rotas de ENTREGADOR
    - **Propriedade 9: ADMIN bloqueado em rotas de ENTREGADOR**
    - **Valida: Requisitos 9.2**

- [x] 5. Checkpoint — Garantir que todos os testes passam
  - Garantir que todos os testes passam, perguntar ao usuário se houver dúvidas.

- [ ] 6. Implementar módulo de usuários
  - [x] 6.1 Criar `UsuariosModule` com `UsuariosService` e `UsuariosController`
    - Implementar `POST /usuarios` (apenas ADMIN): validar email único, validar formato de email, validar senha ≥ 8 caracteres, hashear senha com bcrypt (custo 10), persistir com perfil ENTREGADOR
    - Implementar `GET /usuarios` (apenas ADMIN): listar entregadores
    - _Requisitos: 2.1, 2.2, 2.3, 2.4_
  - [ ] 6.2 Escrever testes unitários para validações de cadastro
    - Testar rejeição de email duplicado, email inválido e senha curta
    - _Requisitos: 2.2, 2.3, 2.4_

- [ ] 7. Implementar módulo de upload de imagens
  - [x] 7.1 Criar `UploadModule` com `UploadService` e `UploadController`
    - Implementar `POST /upload` (apenas ENTREGADOR): validar Content-Type (image/jpeg ou image/png), validar tamanho ≤ 10 MB, fazer upload para Supabase Storage, retornar URL pública
    - Usar `@nestjs/platform-express` com `multer` para receber o arquivo
    - _Requisitos: 4.1, 4.2, 4.3_
  - [ ] 7.2 Escrever teste de propriedade para rejeição por tamanho
    - **Propriedade 6: Upload — rejeição por tamanho**
    - **Valida: Requisitos 4.2**
  - [ ] 7.3 Escrever teste de propriedade para rejeição por formato
    - **Propriedade 7: Upload — rejeição por formato**
    - **Valida: Requisitos 4.3**
  - [ ] 7.4 Escrever teste unitário para falha no Storage
    - Mockar S3 para lançar erro e verificar que a API retorna 500 sem persistir dados
    - _Requisitos: 4.5_

- [ ] 8. Implementar módulo de entregas (backend)
  - [x] 8.1 Criar `EntregasModule` com `EntregasService` e `EntregasController`
    - Implementar `POST /entregas` (apenas ENTREGADOR): validar chave_nfe (regex `^\d{44}$`), validar presença de imagens CANHOTO e LOCAL, validar latitude/longitude, persistir entrega com `data_hora = NOW()` do servidor, associar ao `entregador_id` do JWT
    - _Requisitos: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_
  - [ ] 8.2 Escrever teste de propriedade para entrega válida persistida com timestamp do servidor
    - **Propriedade 3: Entrega válida sempre é persistida com timestamp do servidor**
    - **Valida: Requisitos 3.1, 3.5**
  - [ ] 8.3 Escrever teste de propriedade para rejeição de entrega inválida
    - **Propriedade 4: Entrega inválida nunca é persistida**
    - **Valida: Requisitos 3.2, 3.3, 3.4**
  - [ ] 8.4 Escrever teste de propriedade para validação da chave NF-e
    - **Propriedade 5: Validação da chave NF-e**
    - **Valida: Requisitos 3.6, 6.4**
  - [x] 8.5 Implementar `GET /entregas` (apenas ADMIN): suporte a filtros por `entregador_id`, `data_inicio`, `data_fim`, `chave_nfe` (LIKE), ordenação por `data_hora DESC`, paginação
    - _Requisitos: 7.1, 7.2, 7.3, 7.4, 7.5_
  - [ ] 8.6 Escrever teste de propriedade para ordenação e filtros
    - **Propriedade 10: Filtros de listagem preservam ordenação decrescente**
    - **Valida: Requisitos 7.1, 7.2, 7.3, 7.4**
  - [x] 8.7 Implementar `GET /entregas/:id` (apenas ADMIN): retornar entrega com todos os campos incluindo imagens e nome do entregador, coordenadas com 6 casas decimais
    - _Requisitos: 8.1, 8.2_

- [x] 9. Checkpoint — Garantir que todos os testes passam
  - Garantir que todos os testes passam, perguntar ao usuário se houver dúvidas.

- [ ] 10. Implementar PWA do entregador (Next.js)
  - [x] 10.1 Configurar Next.js com suporte a PWA (`next-pwa`), manifest.json e service worker
    - Configurar viewport mobile-first e meta tags
    - _Requisitos: 5.1_
  - [x] 10.2 Criar tela de login com formulário email/senha
    - Chamar `POST /auth/login`, armazenar JWT no localStorage, redirecionar por perfil
    - _Requisitos: 1.1, 9.3_
  - [x] 10.3 Criar componente de captura de geolocalização
    - Usar `navigator.geolocation.getCurrentPosition()`, exibir confirmação visual ao capturar, exibir erro e bloquear envio se permissão negada, permitir nova tentativa em caso de timeout
    - _Requisitos: 5.1, 5.2, 5.3, 5.4_
  - [ ] 10.4 Escrever testes de componente para geolocalização
    - Mockar `navigator.geolocation` para sucesso, negação de permissão e timeout
    - _Requisitos: 5.2, 5.3, 5.4_
  - [x] 10.5 Criar componente de leitura de QR Code / código de barras
    - Integrar biblioteca de leitura (ex: `html5-qrcode`), extrair chave NF-e do resultado, fallback para input manual
    - _Requisitos: 6.1, 6.2, 6.3_
  - [ ] 10.6 Escrever teste de propriedade para extração da chave NF-e do QR Code
    - **Propriedade 5: Validação da chave NF-e** (lado cliente)
    - **Valida: Requisitos 6.4**
  - [x] 10.7 Criar componente de captura de imagens (câmera)
    - Usar `<input type="file" accept="image/*" capture="environment">`, compressão client-side antes do upload (ex: `browser-image-compression`), exibir preview das imagens capturadas
    - _Requisitos: 4.1, 4.2_
  - [x] 10.8 Criar formulário de nova entrega integrando todos os componentes
    - Validar presença de chave NF-e, 2 imagens e coordenadas antes de habilitar envio
    - Fazer upload das imagens via `POST /upload`, depois criar entrega via `POST /entregas`
    - Exibir loading durante envio, desabilitar botão para evitar duplicatas
    - Exibir mensagem de sucesso e limpar formulário, ou exibir erro mantendo dados
    - _Requisitos: 3.1, 3.2, 3.3, 3.4, 10.1, 10.2, 10.3_
  - [ ] 10.9 Escrever testes de componente para feedback visual do formulário
    - Testar estado de loading, mensagem de sucesso e mensagem de erro com dados mantidos
    - _Requisitos: 10.1, 10.2, 10.3_

- [ ] 11. Implementar painel administrativo (Next.js)
  - [x] 11.1 Criar layout do painel admin com navegação e proteção de rota (redirecionar para login se não autenticado ou perfil ENTREGADOR)
    - _Requisitos: 9.3_
  - [x] 11.2 Criar página de listagem de entregas com tabela, filtros (entregador, data início/fim, chave NF-e) e ordenação por data decrescente
    - Chamar `GET /entregas` com os filtros selecionados, exibir mensagem quando não há resultados
    - _Requisitos: 7.1, 7.2, 7.3, 7.4, 7.5_
  - [x] 11.3 Criar página de detalhe da entrega
    - Exibir todos os campos: chave NF-e, nome do entregador, data/hora, coordenadas (6 casas decimais), imagens com visualização ampliada ao clicar, indicação visual quando sem imagens
    - _Requisitos: 8.1, 8.2, 8.3, 8.4_

- [ ] 12. Integração final e wiring
  - [x] 12.1 Configurar variáveis de ambiente de produção e validação de env vars na inicialização da API (usando `@nestjs/config` com schema Joi)
    - _Requisitos: 1.1, 4.1_
  - [x] 12.2 Adicionar interceptor global de erros na API para garantir formato padrão de resposta de erro em todos os endpoints
    - _Requisitos: 1.2, 3.2, 4.2, 4.3_
  - [ ] 12.3 Escrever testes de integração end-to-end para o fluxo completo de entrega
    - Fluxo: login como entregador → upload de 2 imagens → criar entrega → login como admin → listar entregas → visualizar detalhe
    - _Requisitos: 3.1, 4.1, 7.1, 8.1_

- [ ] 13. Checkpoint final — Garantir que todos os testes passam
  - Garantir que todos os testes passam, perguntar ao usuário se houver dúvidas.

---

## Notas

- Tarefas marcadas com `*` são opcionais e podem ser puladas para um MVP mais rápido
- Cada tarefa referencia requisitos específicos para rastreabilidade
- Os checkpoints garantem validação incremental a cada bloco de funcionalidades
- Testes de propriedade usam a biblioteca `fast-check` com mínimo de 100 iterações cada
- Testes unitários cobrem exemplos concretos, casos de borda e condições de erro
