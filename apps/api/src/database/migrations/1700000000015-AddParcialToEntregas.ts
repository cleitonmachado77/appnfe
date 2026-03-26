import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddParcialToEntregas1700000000015 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "entregas" ADD COLUMN IF NOT EXISTS "parcial" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "entregas" DROP COLUMN IF EXISTS "parcial"`);
  }
}
