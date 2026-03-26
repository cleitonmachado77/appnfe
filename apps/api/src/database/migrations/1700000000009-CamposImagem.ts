import { MigrationInterface, QueryRunner } from 'typeorm';

export class CamposImagem1700000000009 implements MigrationInterface {
  name = 'CamposImagem1700000000009';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Tabela de campos personalizados por empresa
    await queryRunner.query(`
      CREATE TABLE campos_imagem (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        empresa_id  UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        key         VARCHAR(50) NOT NULL,
        label       VARCHAR(100) NOT NULL,
        obrigatorio BOOLEAN NOT NULL DEFAULT true,
        ordem       INT NOT NULL DEFAULT 0,
        ativo       BOOLEAN NOT NULL DEFAULT true,
        criado_em   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE (empresa_id, key)
      )
    `);

    // Adiciona campo_key na tabela imagens
    await queryRunner.query(`
      ALTER TABLE imagens ADD COLUMN IF NOT EXISTS campo_key VARCHAR(50)
    `);

    // Torna tipo nullable (era NOT NULL com enum)
    await queryRunner.query(`
      ALTER TABLE imagens ALTER COLUMN tipo DROP NOT NULL
    `);

    // Popula campo_key a partir do tipo existente
    await queryRunner.query(`
      UPDATE imagens SET campo_key = tipo::text WHERE campo_key IS NULL AND tipo IS NOT NULL
    `);

    // Popula campos padrão para todas as empresas existentes
    await queryRunner.query(`
      INSERT INTO campos_imagem (empresa_id, key, label, obrigatorio, ordem)
      SELECT id, 'CANHOTO', 'Foto do Canhoto', true, 0 FROM empresas
      ON CONFLICT (empresa_id, key) DO NOTHING
    `);

    await queryRunner.query(`
      INSERT INTO campos_imagem (empresa_id, key, label, obrigatorio, ordem)
      SELECT id, 'LOCAL', 'Foto do Local de Entrega', true, 1 FROM empresas
      ON CONFLICT (empresa_id, key) DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE imagens ALTER COLUMN tipo SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE imagens DROP COLUMN IF EXISTS campo_key`);
    await queryRunner.query(`DROP TABLE IF EXISTS campos_imagem`);
  }
}
