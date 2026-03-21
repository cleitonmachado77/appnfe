import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1700000000000 implements MigrationInterface {
  name = 'InitialSchema1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enums
    await queryRunner.query(`
      CREATE TYPE perfil_usuario AS ENUM ('ENTREGADOR', 'ADMIN')
    `);
    await queryRunner.query(`
      CREATE TYPE status_entrega AS ENUM ('ENVIADO', 'PENDENTE', 'ERRO')
    `);
    await queryRunner.query(`
      CREATE TYPE tipo_imagem AS ENUM ('CANHOTO', 'LOCAL')
    `);

    // Tabela usuarios
    await queryRunner.query(`
      CREATE TABLE usuarios (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nome       VARCHAR(255) NOT NULL,
        email      VARCHAR(255) NOT NULL UNIQUE,
        senha_hash VARCHAR(255) NOT NULL,
        tipo       perfil_usuario NOT NULL,
        criado_em  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Tabela entregas
    await queryRunner.query(`
      CREATE TABLE entregas (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        chave_nfe     CHAR(44) NOT NULL,
        entregador_id UUID NOT NULL REFERENCES usuarios(id),
        data_hora     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        latitude      DECIMAL(10, 6) NOT NULL,
        longitude     DECIMAL(10, 6) NOT NULL,
        status        status_entrega NOT NULL DEFAULT 'ENVIADO',
        criado_em     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Tabela imagens
    await queryRunner.query(`
      CREATE TABLE imagens (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        entrega_id  UUID NOT NULL REFERENCES entregas(id) ON DELETE CASCADE,
        tipo        tipo_imagem NOT NULL,
        url_arquivo VARCHAR(1024) NOT NULL,
        criado_em   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Índices
    await queryRunner.query(`
      CREATE INDEX idx_entregas_entregador ON entregas(entregador_id)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_entregas_data_hora ON entregas(data_hora DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_entregas_chave_nfe ON entregas(chave_nfe)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_entregas_chave_nfe`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_entregas_data_hora`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_entregas_entregador`);

    await queryRunner.query(`DROP TABLE IF EXISTS imagens`);
    await queryRunner.query(`DROP TABLE IF EXISTS entregas`);
    await queryRunner.query(`DROP TABLE IF EXISTS usuarios`);

    await queryRunner.query(`DROP TYPE IF EXISTS tipo_imagem`);
    await queryRunner.query(`DROP TYPE IF EXISTS status_entrega`);
    await queryRunner.query(`DROP TYPE IF EXISTS perfil_usuario`);
  }
}
