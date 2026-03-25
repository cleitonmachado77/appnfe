import { MigrationInterface, QueryRunner } from 'typeorm';

export class SuperAdmin1700000000003 implements MigrationInterface {
  name = 'SuperAdmin1700000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Tabela empresas
    await queryRunner.query(`
      CREATE TYPE status_empresa AS ENUM ('ATIVA', 'INATIVA', 'SUSPENSA')
    `);
    await queryRunner.query(`
      CREATE TABLE empresas (
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
      )
    `);

    // Adicionar SUPER_ADMIN ao enum existente
    await queryRunner.query(`ALTER TYPE perfil_usuario ADD VALUE IF NOT EXISTS 'SUPER_ADMIN'`);

    // Adicionar empresa_id em usuarios
    await queryRunner.query(`
      ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES empresas(id) ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE usuarios DROP COLUMN IF EXISTS empresa_id`);
    await queryRunner.query(`DROP TABLE IF EXISTS empresas`);
    await queryRunner.query(`DROP TYPE IF EXISTS status_empresa`);
  }
}
