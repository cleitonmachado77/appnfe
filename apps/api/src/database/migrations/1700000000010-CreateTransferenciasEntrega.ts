import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTransferenciasEntrega1700000000010 implements MigrationInterface {
  name = 'CreateTransferenciasEntrega1700000000010';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE status_transferencia AS ENUM ('PENDENTE', 'ACEITA', 'RECUSADA')
    `);

    await queryRunner.query(`
      CREATE TABLE transferencias_entrega (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        entrega_id       UUID NOT NULL REFERENCES entregas(id) ON DELETE CASCADE,
        remetente_id     UUID NOT NULL REFERENCES usuarios(id),
        destinatario_id  UUID NOT NULL REFERENCES usuarios(id),
        status           status_transferencia NOT NULL DEFAULT 'PENDENTE',
        mensagem         TEXT,
        criado_em        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_transf_destinatario ON transferencias_entrega(destinatario_id, status)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_transf_entrega ON transferencias_entrega(entrega_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS transferencias_entrega`);
    await queryRunner.query(`DROP TYPE IF EXISTS status_transferencia`);
  }
}
