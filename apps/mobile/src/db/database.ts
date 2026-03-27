import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('entregas.db');
  await initTables(db);
  return db;
}

async function initTables(database: SQLite.SQLiteDatabase) {
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS auth (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      token TEXT NOT NULL,
      perfil TEXT NOT NULL,
      nome TEXT NOT NULL,
      user_id TEXT
    );

    CREATE TABLE IF NOT EXISTS campos_imagem (
      id TEXT PRIMARY KEY,
      key TEXT NOT NULL,
      label TEXT NOT NULL,
      obrigatorio INTEGER NOT NULL DEFAULT 1,
      ordem INTEGER NOT NULL DEFAULT 0,
      ativo INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS entregas_offline (
      local_id TEXT PRIMARY KEY,
      server_id TEXT,
      chave_nfe TEXT NOT NULL,
      latitude REAL NOT NULL DEFAULT 0,
      longitude REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'PENDENTE',
      campos_ausentes TEXT,
      criado_em TEXT NOT NULL,
      sincronizado INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS imagens_offline (
      local_id TEXT PRIMARY KEY,
      entrega_local_id TEXT NOT NULL,
      campo_key TEXT NOT NULL,
      file_uri TEXT NOT NULL,
      url_arquivo TEXT,
      sincronizado INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (entrega_local_id) REFERENCES entregas_offline(local_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      payload TEXT NOT NULL,
      criado_em TEXT NOT NULL,
      tentativas INTEGER NOT NULL DEFAULT 0,
      erro TEXT
    );

    CREATE TABLE IF NOT EXISTS entregas_cache (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      atualizado_em TEXT NOT NULL
    );
  `);
}

export function generateLocalId(): string {
  return 'local_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
}
