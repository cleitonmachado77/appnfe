import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuditLogs1700000000005 implements MigrationInterface {
  name = 'CreateAuditLogs1700000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE audit_logs (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        usuario_id    UUID,
        usuario_nome  VARCHAR(255),
        usuario_email VARCHAR(255),
        empresa_id    UUID,
        acao          VARCHAR(100) NOT NULL,
        recurso       VARCHAR(100),
        recurso_id    UUID,
        descricao     TEXT,
        metodo_http   VARCHAR(10),
        rota          VARCHAR(500),
        status_http   INT,
        criado_em     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_audit_logs_empresa ON audit_logs(empresa_id)`);
    await queryRunner.query(`CREATE INDEX idx_audit_logs_criado_em ON audit_logs(criado_em DESC)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS audit_logs`);
  }
}
