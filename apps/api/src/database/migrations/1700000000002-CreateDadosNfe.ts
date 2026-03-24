import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDadosNfe1700000000002 implements MigrationInterface {
  name = 'CreateDadosNfe1700000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE dados_nfe (
        id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        entrega_id        UUID NOT NULL UNIQUE REFERENCES entregas(id) ON DELETE CASCADE,
        emit_nome         VARCHAR(255),
        emit_cnpj         VARCHAR(18),
        emit_uf           VARCHAR(2),
        dest_nome         VARCHAR(255),
        dest_cnpj_cpf     VARCHAR(18),
        dest_municipio    VARCHAR(255),
        dest_uf           VARCHAR(2),
        numero_nfe        VARCHAR(20),
        serie             VARCHAR(10),
        data_emissao      TIMESTAMP WITH TIME ZONE,
        valor_total       DECIMAL(15, 2),
        valor_produtos    DECIMAL(15, 2),
        valor_frete       DECIMAL(15, 2),
        valor_desconto    DECIMAL(15, 2),
        quantidade_itens  INT,
        natureza_operacao VARCHAR(255),
        transportadora_nome VARCHAR(255),
        peso_bruto        DECIMAL(10, 3),
        criado_em         TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_dados_nfe_entrega ON dados_nfe(entrega_id)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_dados_nfe_data_emissao ON dados_nfe(data_emissao)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_dados_nfe_dest_uf ON dados_nfe(dest_uf)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_dados_nfe_dest_uf`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_dados_nfe_data_emissao`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_dados_nfe_entrega`);
    await queryRunner.query(`DROP TABLE IF EXISTS dados_nfe`);
  }
}
