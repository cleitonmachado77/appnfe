import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddComentarioReativacaoToEntregas1700000000012 implements MigrationInterface {
  name = 'AddComentarioReativacaoToEntregas1700000000012';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE entregas ADD COLUMN IF NOT EXISTS comentario_reativacao TEXT
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE entregas DROP COLUMN IF EXISTS comentario_reativacao
    `);
  }
}
