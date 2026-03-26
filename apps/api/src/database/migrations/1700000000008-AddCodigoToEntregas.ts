import { MigrationInterface, QueryRunner } from 'typeorm';

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function gerarCodigo(): string {
  let codigo = '';
  for (let i = 0; i < 6; i++) {
    codigo += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return codigo;
}

export class AddCodigoToEntregas1700000000008 implements MigrationInterface {
  name = 'AddCodigoToEntregas1700000000008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE entregas ADD COLUMN IF NOT EXISTS codigo CHAR(6) UNIQUE
    `);

    // Popula registros existentes com códigos únicos
    const rows: { id: string }[] = await queryRunner.query(
      `SELECT id FROM entregas WHERE codigo IS NULL`,
    );

    const usados = new Set<string>();

    for (const row of rows) {
      let codigo: string;
      do {
        codigo = gerarCodigo();
      } while (usados.has(codigo));

      usados.add(codigo);
      await queryRunner.query(`UPDATE entregas SET codigo = $1 WHERE id = $2`, [
        codigo,
        row.id,
      ]);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE entregas DROP COLUMN IF EXISTS codigo`);
  }
}
