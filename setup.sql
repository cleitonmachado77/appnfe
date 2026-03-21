-- ============================================================
-- NF-e Delivery Proof — Setup do banco de dados
-- Execute este script no SQL Editor do Supabase
-- ============================================================

-- Enums
CREATE TYPE perfil_usuario AS ENUM ('ENTREGADOR', 'ADMIN');
CREATE TYPE status_entrega AS ENUM ('ENVIADO', 'PENDENTE', 'ERRO');
CREATE TYPE tipo_imagem    AS ENUM ('CANHOTO', 'LOCAL');

-- Tabela de usuários
CREATE TABLE usuarios (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome       VARCHAR(255) NOT NULL,
  email      VARCHAR(255) NOT NULL UNIQUE,
  senha_hash VARCHAR(255) NOT NULL,
  tipo       perfil_usuario NOT NULL,
  criado_em  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de entregas
CREATE TABLE entregas (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chave_nfe     CHAR(44) NOT NULL,
  entregador_id UUID NOT NULL REFERENCES usuarios(id),
  data_hora     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  latitude      DECIMAL(10, 6) NOT NULL,
  longitude     DECIMAL(10, 6) NOT NULL,
  status        status_entrega NOT NULL DEFAULT 'ENVIADO',
  criado_em     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de imagens
CREATE TABLE imagens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entrega_id  UUID NOT NULL REFERENCES entregas(id) ON DELETE CASCADE,
  tipo        tipo_imagem NOT NULL,
  url_arquivo VARCHAR(1024) NOT NULL,
  criado_em   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_entregas_entregador ON entregas(entregador_id);
CREATE INDEX idx_entregas_data_hora  ON entregas(data_hora DESC);
CREATE INDEX idx_entregas_chave_nfe  ON entregas(chave_nfe);

-- ============================================================
-- Usuário ADMIN inicial
-- Senha: Admin@1234  (bcrypt custo 10)
-- Troque a senha após o primeiro login criando um novo hash
-- ============================================================
INSERT INTO usuarios (nome, email, senha_hash, tipo) VALUES (
  'Administrador',
  'admin@empresa.com',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'ADMIN'
);
