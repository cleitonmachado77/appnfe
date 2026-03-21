# Documento de Requisitos

## Introdução

Este documento descreve os requisitos funcionais e não funcionais do MVP do SaaS de Comprovação Digital de Recebimento de NF-e. O sistema tem como objetivo substituir o processo manual de comprovação de entrega (canhoto físico) por um fluxo 100% digital, auditável e georreferenciado. Entregadores registram entregas via PWA mobile e gestores auditam os registros via painel administrativo web.

Nesta versão MVP, não há integração com SEFAZ ou Receita Federal. O sistema opera exclusivamente com os dados capturados no momento da entrega.

## Glossário

- **Sistema**: O SaaS de Comprovação Digital de Recebimento de NF-e
- **Entregador**: Usuário operacional que utiliza o sistema via PWA mobile para registrar entregas
- **Gestor**: Usuário administrador que acessa o painel web para visualizar e auditar registros
- **NF-e**: Nota Fiscal Eletrônica
- **Chave_NF-e**: Código de 44 dígitos que identifica unicamente uma NF-e
- **Entrega**: Registro digital de comprovação de recebimento de uma NF-e
- **PWA**: Progressive Web App — aplicação web com capacidades mobile
- **JWT**: JSON Web Token — mecanismo de autenticação stateless
- **Comprovante**: Conjunto de dados (chave NF-e, imagens, localização, timestamp) que compõem uma entrega registrada
- **API**: Interface de programação de aplicações (backend REST)
- **Storage**: Serviço de armazenamento de arquivos em nuvem (ex: AWS S3)

---

## Requisitos

### Requisito 1: Autenticação de Usuários

**User Story:** Como usuário do sistema (entregador ou gestor), quero fazer login com email e senha, para que eu possa acessar as funcionalidades correspondentes ao meu perfil.

#### Critérios de Aceitação

1. WHEN um usuário submete email e senha válidos, THE Sistema SHALL autenticar o usuário e retornar um token JWT com validade de 8 horas
2. WHEN um usuário submete email ou senha inválidos, THE Sistema SHALL retornar uma mensagem de erro genérica sem revelar qual campo está incorreto
3. WHEN um token JWT expirado é utilizado em uma requisição, THE Sistema SHALL retornar status HTTP 401 e rejeitar a requisição
4. WHEN um token JWT válido é utilizado, THE Sistema SHALL identificar o perfil do usuário (ENTREGADOR ou ADMIN) e aplicar as permissões correspondentes
5. THE Sistema SHALL armazenar senhas utilizando algoritmo de hash bcrypt com fator de custo mínimo de 10

---

### Requisito 2: Cadastro e Gerenciamento de Entregadores

**User Story:** Como gestor, quero cadastrar entregadores no sistema, para que eles possam acessar o PWA e registrar entregas vinculadas ao meu tenant.

#### Critérios de Aceitação

1. WHEN um gestor submete nome, email e senha para cadastro de entregador, THE Sistema SHALL criar o usuário com perfil ENTREGADOR e retornar confirmação
2. WHEN um gestor tenta cadastrar um email já existente, THE Sistema SHALL retornar erro informando que o email já está em uso
3. THE Sistema SHALL validar que o email possui formato válido antes de persistir o cadastro
4. THE Sistema SHALL validar que a senha possui no mínimo 8 caracteres antes de persistir o cadastro

---

### Requisito 3: Registro de Entrega pelo Entregador

**User Story:** Como entregador, quero registrar digitalmente a comprovação de entrega de uma NF-e, para que o processo seja auditável e rastreável sem uso de papel.

#### Critérios de Aceitação

1. WHEN um entregador submete uma entrega com chave NF-e, 2 imagens obrigatórias, latitude e longitude, THE Sistema SHALL persistir o registro com status ENVIADO e associar ao entregador autenticado
2. WHEN um entregador tenta submeter uma entrega sem a chave NF-e, THE Sistema SHALL rejeitar a requisição com erro de validação
3. WHEN um entregador tenta submeter uma entrega sem as 2 imagens obrigatórias (CANHOTO e LOCAL), THE Sistema SHALL rejeitar a requisição com erro de validação
4. WHEN um entregador tenta submeter uma entrega sem coordenadas geográficas, THE Sistema SHALL rejeitar a requisição com erro de validação
5. THE Sistema SHALL registrar automaticamente o timestamp do servidor no momento da criação da entrega, independentemente do horário informado pelo cliente
6. THE Sistema SHALL validar que a chave NF-e possui exatamente 44 dígitos numéricos

---

### Requisito 4: Upload de Imagens

**User Story:** Como entregador, quero enviar fotos do canhoto e do local de entrega, para que o comprovante seja visualmente verificável pelo gestor.

#### Critérios de Aceitação

1. WHEN um entregador envia uma imagem com tamanho inferior a 10 MB e formato JPEG ou PNG, THE Sistema SHALL armazenar o arquivo no Storage e retornar a URL de acesso
2. WHEN um entregador envia uma imagem com tamanho superior a 10 MB, THE Sistema SHALL rejeitar o upload com mensagem de erro indicando o limite
3. WHEN um entregador envia um arquivo com formato diferente de JPEG ou PNG, THE Sistema SHALL rejeitar o upload com mensagem de erro indicando os formatos aceitos
4. THE Sistema SHALL associar cada imagem a uma entrega com tipo CANHOTO ou LOCAL
5. WHEN o armazenamento da imagem falha no Storage, THE Sistema SHALL retornar erro e não persistir o registro da entrega

---

### Requisito 5: Captura de Geolocalização no PWA

**User Story:** Como entregador, quero que o sistema capture automaticamente minha localização no momento da entrega, para que o comprovante seja georreferenciado.

#### Critérios de Aceitação

1. WHEN o entregador inicia um novo registro de entrega, THE PWA SHALL solicitar permissão de geolocalização ao navegador
2. WHEN o navegador concede permissão de geolocalização, THE PWA SHALL capturar latitude e longitude via API navigator.geolocation e exibir confirmação visual
3. IF o navegador nega permissão de geolocalização, THEN THE PWA SHALL exibir mensagem orientando o usuário a habilitar a permissão e bloquear o envio da entrega
4. IF a captura de geolocalização falha por timeout ou erro técnico, THEN THE PWA SHALL exibir mensagem de erro e permitir nova tentativa

---

### Requisito 6: Leitura da Chave NF-e no PWA

**User Story:** Como entregador, quero escanear o QR Code ou código de barras da NF-e, para que eu não precise digitar manualmente os 44 dígitos.

#### Critérios de Aceitação

1. WHEN o entregador aciona a leitura de QR Code, THE PWA SHALL ativar a câmera do dispositivo e iniciar a leitura do código
2. WHEN um QR Code ou código de barras válido é lido, THE PWA SHALL extrair a chave NF-e e preencher automaticamente o campo correspondente
3. IF a leitura automática falha ou não é suportada pelo dispositivo, THEN THE PWA SHALL permitir que o entregador digite manualmente a chave NF-e
4. THE PWA SHALL validar que a chave digitada ou lida possui exatamente 44 dígitos numéricos antes de prosseguir

---

### Requisito 7: Painel Administrativo — Listagem de Entregas

**User Story:** Como gestor, quero visualizar todas as entregas registradas em uma listagem organizada, para que eu possa monitorar e auditar o processo de entrega.

#### Critérios de Aceitação

1. WHEN um gestor acessa o painel administrativo, THE Sistema SHALL exibir a listagem de entregas ordenada por data_hora decrescente (mais recente primeiro)
2. WHEN um gestor aplica filtro por entregador, THE Sistema SHALL retornar apenas as entregas associadas ao entregador selecionado
3. WHEN um gestor aplica filtro por intervalo de datas, THE Sistema SHALL retornar apenas as entregas com data_hora dentro do intervalo informado
4. WHEN um gestor aplica filtro por chave NF-e, THE Sistema SHALL retornar as entregas cuja chave_nfe contenha o valor informado (busca parcial)
5. WHEN nenhuma entrega corresponde aos filtros aplicados, THE Sistema SHALL exibir mensagem informando que nenhum resultado foi encontrado

---

### Requisito 8: Painel Administrativo — Visualização Detalhada

**User Story:** Como gestor, quero visualizar os detalhes completos de uma entrega específica, para que eu possa auditar todas as informações registradas.

#### Critérios de Aceitação

1. WHEN um gestor seleciona uma entrega na listagem, THE Sistema SHALL exibir: chave NF-e, nome do entregador, data e hora, coordenadas geográficas e imagens anexadas
2. WHEN um gestor visualiza as coordenadas geográficas de uma entrega, THE Sistema SHALL exibir latitude e longitude com precisão de 6 casas decimais
3. WHEN um gestor clica em uma imagem anexada, THE Sistema SHALL exibir a imagem em tamanho ampliado
4. IF uma entrega não possui imagens associadas, THEN THE Sistema SHALL exibir indicação visual de ausência de imagens

---

### Requisito 9: Controle de Acesso por Perfil

**User Story:** Como administrador do sistema, quero que as funcionalidades sejam restritas por perfil de usuário, para que entregadores não acessem o painel administrativo e gestores não registrem entregas indevidamente.

#### Critérios de Aceitação

1. WHEN um usuário com perfil ENTREGADOR tenta acessar endpoints administrativos, THE Sistema SHALL retornar status HTTP 403 e negar o acesso
2. WHEN um usuário com perfil ADMIN tenta criar uma entrega via endpoint de entregador, THE Sistema SHALL retornar status HTTP 403 e negar o acesso
3. WHILE um usuário não está autenticado, THE Sistema SHALL redirecionar qualquer acesso a rotas protegidas para a tela de login
4. THE Sistema SHALL validar o perfil do usuário a partir do token JWT em cada requisição a rotas protegidas

---

### Requisito 10: Feedback Visual no PWA

**User Story:** Como entregador, quero receber feedback claro sobre o resultado do envio da entrega, para que eu saiba se o registro foi concluído com sucesso ou se preciso tentar novamente.

#### Critérios de Aceitação

1. WHEN o envio de uma entrega é concluído com sucesso, THE PWA SHALL exibir mensagem de confirmação e limpar o formulário para novo registro
2. IF o envio de uma entrega falha por erro de rede ou servidor, THEN THE PWA SHALL exibir mensagem de erro descritiva e manter os dados preenchidos para reenvio
3. WHILE o envio de uma entrega está em processamento, THE PWA SHALL exibir indicador de carregamento e desabilitar o botão de envio para evitar duplicatas
