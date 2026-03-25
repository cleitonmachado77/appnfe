-- PASSO 2: Rodar após o passo 1 ser commitado

-- Criar tipo status_empresa (se ainda não existir)
DO $$ BEGIN
  CREATE TYPE status_empresa AS ENUM ('ATIVA', 'INATIVA', 'SUSPENSA');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Criar tabela de empresas
CREATE TABLE IF NOT EXISTS empresas (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  razao_social         VARCHAR(255) NOT NULL,
  nome_fantasia        VARCHAR(255),
  cnpj                 VARCHAR(18) NOT NULL UNIQUE,
  inscricao_estadual   VARCHAR(20),
  segmento             VARCHAR(100),
  email_contato        VARCHAR(255) NOT NULL,
  telefone             VARCHAR(20),
  celular              VARCHAR(20),
  site                 VARCHAR(255),
  cep                  VARCHAR(9),
  logradouro           VARCHAR(255),
  numero               VARCHAR(20),
  complemento          VARCHAR(100),
  bairro               VARCHAR(100),
  cidade               VARCHAR(100),
  uf                   VARCHAR(2),
  responsavel_nome     VARCHAR(255) NOT NULL,
  responsavel_email    VARCHAR(255) NOT NULL,
  responsavel_telefone VARCHAR(20),
  responsavel_cpf      VARCHAR(14),
  plano                VARCHAR(50),
  status               status_empresa NOT NULL DEFAULT 'ATIVA',
  observacoes          TEXT,
  criado_em            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar coluna empresa_id em usuarios
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES empresas(id) ON DELETE SET NULL;

-- Inserir usuário Super Admin (senha: 143025)
INSERT INTO usuarios (nome, email, senha_hash, tipo)
VALUES (
  'Super Admin',
  'admin@admin.com',
  '$2b$10$irzDGC6MHETsQGDg93BZK.tldhNYsE.h1/6PV1JngYd2Zb/X4VUUu',
  'SUPER_ADMIN'
)
ON CONFLICT (email) DO NOTHING;
