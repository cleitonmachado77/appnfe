import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCertificadoToEmpresas1700000000007 implements MigrationInterface {
  name = 'AddCertificadoToEmpresas1700000000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE empresas
        ADD COLUMN IF NOT EXISTS cert_pfx_encrypted    TEXT,
        ADD COLUMN IF NOT EXISTS cert_senha_encrypted  TEXT,
        ADD COLUMN IF NOT EXISTS cert_validade         TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS cert_titular          VARCHAR(255)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE empresas
        DROP COLUMN IF EXISTS cert_pfx_encrypted,
        DROP COLUMN IF EXISTS cert_senha_encrypted,
        DROP COLUMN IF EXISTS cert_validade,
        DROP COLUMN IF EXISTS cert_titular
    `);
  }
}
