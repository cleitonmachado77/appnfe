import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDanfePdfToEntregas1700000000001 implements MigrationInterface {
  name = 'AddDanfePdfToEntregas1700000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE entregas ADD COLUMN IF NOT EXISTS danfe_pdf_base64 TEXT
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE entregas DROP COLUMN IF EXISTS danfe_pdf_base64
    `);
  }
}
