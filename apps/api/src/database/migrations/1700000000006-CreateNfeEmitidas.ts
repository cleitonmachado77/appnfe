import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNfeEmitidas1700000000006 implements MigrationInterface {
  name = 'CreateNfeEmitidas1700000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE status_nfe_emitida AS ENUM ('PENDENTE', 'COMPLETA', 'CANCELADA', 'ERRO')
    `);

    await queryRunner.query(`
      CREATE TABLE nfe_emitidas (
        id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        empresa_id        UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        chave_nfe         CHAR(44) NOT NULL UNIQUE,
        numero_nfe        VARCHAR(20),
        serie             VARCHAR(10),
        dest_nome         VARCHAR(255),
        dest_cnpj_cpf     VARCHAR(18),
        dest_municipio    VARCHAR(255),
        dest_uf           VARCHAR(2),
        valor_total       DECIMAL(15, 2),
        data_emissao      TIMESTAMP WITH TIME ZONE,
        natureza_operacao VARCHAR(255),
        status            status_nfe_emitida NOT NULL DEFAULT 'PENDENTE',
        nsu               VARCHAR(15),
        xml_completo      TEXT,
        danfe_pdf_base64  TEXT,
        entrega_chave_nfe CHAR(44),
        criado_em         TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        atualizado_em     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_nfe_emitidas_empresa ON nfe_emitidas(empresa_id)`);
    await queryRunner.query(`CREATE INDEX idx_nfe_emitidas_chave ON nfe_emitidas(chave_nfe)`);
    await queryRunner.query(`CREATE INDEX idx_nfe_emitidas_data_emissao ON nfe_emitidas(data_emissao)`);
    await queryRunner.query(`CREATE INDEX idx_nfe_emitidas_nsu ON nfe_emitidas(nsu)`);

    await queryRunner.query(`
      CREATE TABLE controle_nsu (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        empresa_id    UUID NOT NULL UNIQUE REFERENCES empresas(id) ON DELETE CASCADE,
        ult_nsu       VARCHAR(15) NOT NULL DEFAULT '000000000000000',
        max_nsu       VARCHAR(15),
        atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS controle_nsu`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_nfe_emitidas_nsu`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_nfe_emitidas_data_emissao`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_nfe_emitidas_chave`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_nfe_emitidas_empresa`);
    await queryRunner.query(`DROP TABLE IF EXISTS nfe_emitidas`);
    await queryRunner.query(`DROP TYPE IF EXISTS status_nfe_emitida`);
  }
}
