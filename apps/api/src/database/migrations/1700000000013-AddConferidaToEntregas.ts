import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddConferidaToEntregas1700000000013 implements MigrationInterface {
  name = 'AddConferidaToEntregas1700000000013';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE entregas
        ADD COLUMN IF NOT EXISTS conferida BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS conferida_em TIMESTAMP WITH TIME ZONE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE entregas
        DROP COLUMN IF EXISTS conferida,
        DROP COLUMN IF EXISTS conferida_em
    `);
  }
}
