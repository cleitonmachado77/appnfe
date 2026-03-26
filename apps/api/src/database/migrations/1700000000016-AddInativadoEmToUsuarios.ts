import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInativadoEmToUsuarios1700000000016 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "inativado_em" timestamptz`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "usuarios" DROP COLUMN IF EXISTS "inativado_em"`);
  }
}
