import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCamposAusentesToEntregas1700000000014 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "entregas" ADD COLUMN IF NOT EXISTS "campos_ausentes" text`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "entregas" DROP COLUMN IF EXISTS "campos_ausentes"`);
  }
}
