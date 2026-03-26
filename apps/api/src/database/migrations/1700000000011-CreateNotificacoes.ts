import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNotificacoes1700000000011 implements MigrationInterface {
  name = 'CreateNotificacoes1700000000011';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE tipo_notificacao AS ENUM ('REATIVACAO', 'TRANSFERENCIA', 'MIGRACAO')
    `);

    await queryRunner.query(`
      CREATE TABLE notificacoes (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        usuario_id  UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        tipo        tipo_notificacao NOT NULL,
        mensagem    TEXT NOT NULL,
        entrega_id  UUID REFERENCES entregas(id) ON DELETE SET NULL,
        lida        BOOLEAN NOT NULL DEFAULT false,
        criado_em   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_notificacoes_usuario ON notificacoes(usuario_id, lida)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS notificacoes`);
    await queryRunner.query(`DROP TYPE IF EXISTS tipo_notificacao`);
  }
}
