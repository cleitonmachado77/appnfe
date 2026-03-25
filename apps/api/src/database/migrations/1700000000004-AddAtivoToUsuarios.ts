import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAtivoToUsuarios1700000000004 implements MigrationInterface {
  name = 'AddAtivoToUsuarios1700000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT true
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE usuarios DROP COLUMN IF EXISTS ativo`);
  }
}
