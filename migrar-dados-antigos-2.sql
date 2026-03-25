-- PASSO 2: Criar tabela empresas e vincular dados legados
-- Rodar após o PASSO 1 ser commitado

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

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES empresas(id) ON DELETE SET NULL;

-- Criar empresa para o Administrador legado
INSERT INTO empresas (
  id,
  razao_social,
  nome_fantasia,
  cnpj,
  email_contato,
  responsavel_nome,
  responsavel_email,
  status,
  criado_em,
  atualizado_em
) VALUES (
  'aaaaaaaa-0000-0000-0000-000000000001',
  'Empresa Administrador',
  'ADD+',
  '00000000000000',
  'admin@empresa.com',
  'Administrador',
  'admin@empresa.com',
  'ATIVA',
  '2026-03-21 15:09:34+00',
  NOW()
);

-- Vincular Administrador à empresa
UPDATE usuarios
SET empresa_id = 'aaaaaaaa-0000-0000-0000-000000000001'
WHERE id = '8dba6dc8-bd41-4458-9fcd-6bac682ada32';

-- Vincular todos os entregadores sem empresa à mesma empresa
UPDATE usuarios
SET empresa_id = 'aaaaaaaa-0000-0000-0000-000000000001'
WHERE tipo = 'ENTREGADOR'
  AND empresa_id IS NULL;

-- Confirmar
SELECT id, nome, tipo, empresa_id FROM usuarios ORDER BY criado_em;
