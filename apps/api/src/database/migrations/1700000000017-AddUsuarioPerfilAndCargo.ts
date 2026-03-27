import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUsuarioPerfilAndCargo1700000000017 implements MigrationInterface {
  name = 'AddUsuarioPerfilAndCargo1700000000017';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE perfil_usuario ADD VALUE IF NOT EXISTS 'USUARIO'`);
    await queryRunner.query(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS cargo VARCHAR(100) NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE usuarios DROP COLUMN IF EXISTS cargo`);
  }
}
