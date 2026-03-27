import { getDatabase, generateLocalId } from './database';
import {
  apiUploadImagem, apiCriarEntrega, apiFinalizarEntrega,
  apiListarCamposImagem,
  type CriarEntregaPayload, type EntregaResponse,
} from '../api/client';

// ─── Salvar entrega offline ──────────────────────────────────────────────────

export interface EntregaOffline {
  local_id: string;
  server_id: string | null;
  chave_nfe: string;
  latitude: number;
  longitude: number;
  status: 'PENDENTE' | 'ENVIADO';
  campos_ausentes: string[] | null;
  criado_em: string;
  sincronizado: boolean;
}

export interface ImagemOffline {
  local_id: string;
  entrega_local_id: string;
  campo_key: string;
  file_uri: string;
  url_arquivo: string | null;
  sincronizado: boolean;
}

export async function salvarEntregaOffline(
  chaveNfe: string,
  latitude: number,
  longitude: number,
  status: 'PENDENTE' | 'ENVIADO',
  imagens: { campo_key: string; file_uri: string }[],
  camposAusentes?: string[],
): Promise<string> {
  const db = await getDatabase();
  const localId = generateLocalId();
  const agora = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO entregas_offline (local_id, chave_nfe, latitude, longitude, status, campos_ausentes, criado_em, sincronizado)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
    [localId, chaveNfe, latitude, longitude, status, camposAusentes?.join(',') ?? null, agora],
  );

  for (const img of imagens) {
    const imgId = generateLocalId();
    await db.runAsync(
      `INSERT INTO imagens_offline (local_id, entrega_local_id, campo_key, file_uri, sincronizado)
       VALUES (?, ?, ?, ?, 0)`,
      [imgId, localId, img.campo_key, img.file_uri],
    );
  }

  return localId;
}

// ─── Atualizar entrega offline existente ─────────────────────────────────────

export async function atualizarEntregaOffline(
  localId: string,
  updates: {
    latitude?: number;
    longitude?: number;
    status?: 'PENDENTE' | 'ENVIADO';
    campos_ausentes?: string[];
  },
  novasImagens?: { campo_key: string; file_uri: string }[],
): Promise<void> {
  const db = await getDatabase();

  const sets: string[] = [];
  const values: any[] = [];

  if (updates.latitude !== undefined) { sets.push('latitude = ?'); values.push(updates.latitude); }
  if (updates.longitude !== undefined) { sets.push('longitude = ?'); values.push(updates.longitude); }
  if (updates.status !== undefined) { sets.push('status = ?'); values.push(updates.status); }
  if (updates.campos_ausentes !== undefined) {
    sets.push('campos_ausentes = ?');
    values.push(updates.campos_ausentes.length ? updates.campos_ausentes.join(',') : null);
  }
  // Marca como não sincronizado para reenviar
  sets.push('sincronizado = 0');

  if (sets.length > 0) {
    values.push(localId);
    await db.runAsync(`UPDATE entregas_offline SET ${sets.join(', ')} WHERE local_id = ?`, values);
  }

  if (novasImagens && novasImagens.length > 0) {
    for (const img of novasImagens) {
      const imgId = generateLocalId();
      await db.runAsync(
        `INSERT INTO imagens_offline (local_id, entrega_local_id, campo_key, file_uri, sincronizado)
         VALUES (?, ?, ?, ?, 0)`,
        [imgId, localId, img.campo_key, img.file_uri],
      );
    }
  }
}

// ─── Buscar entrega offline por local_id ─────────────────────────────────────

export async function buscarEntregaOffline(localId: string): Promise<EntregaOffline | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<any>(
    'SELECT * FROM entregas_offline WHERE local_id = ?',
    [localId],
  );
  if (!row) return null;
  return {
    ...row,
    campos_ausentes: row.campos_ausentes ? row.campos_ausentes.split(',') : null,
    sincronizado: !!row.sincronizado,
  };
}

// ─── Listar entregas offline não sincronizadas ───────────────────────────────

export async function listarEntregasOffline(): Promise<EntregaOffline[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>('SELECT * FROM entregas_offline ORDER BY criado_em DESC');
  return rows.map((r) => ({
    ...r,
    campos_ausentes: r.campos_ausentes ? r.campos_ausentes.split(',') : null,
    sincronizado: !!r.sincronizado,
  }));
}

export async function listarImagensOffline(entregaLocalId: string): Promise<ImagemOffline[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM imagens_offline WHERE entrega_local_id = ?',
    [entregaLocalId],
  );
  return rows.map((r) => ({ ...r, sincronizado: !!r.sincronizado }));
}

export async function excluirEntregaOffline(localId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM imagens_offline WHERE entrega_local_id = ?', [localId]);
  await db.runAsync('DELETE FROM entregas_offline WHERE local_id = ?', [localId]);
}

// ─── Sincronização ───────────────────────────────────────────────────────────

export async function sincronizarEntregasPendentes(token: string): Promise<{
  sucesso: number;
  falhas: number;
}> {
  const db = await getDatabase();
  const pendentes = await db.getAllAsync<any>(
    'SELECT * FROM entregas_offline WHERE sincronizado = 0 ORDER BY criado_em ASC',
  );

  let sucesso = 0;
  let falhas = 0;

  for (const entrega of pendentes) {
    try {
      // 1. Upload das imagens que ainda não foram enviadas
      const imagens = await db.getAllAsync<any>(
        'SELECT * FROM imagens_offline WHERE entrega_local_id = ? AND sincronizado = 0',
        [entrega.local_id],
      );

      const imagensUpload: { url_arquivo: string; tipo: string }[] = [];

      // Inclui imagens já sincronizadas anteriormente
      const imgsSincronizadas = await db.getAllAsync<any>(
        'SELECT * FROM imagens_offline WHERE entrega_local_id = ? AND sincronizado = 1 AND url_arquivo IS NOT NULL',
        [entrega.local_id],
      );
      for (const img of imgsSincronizadas) {
        imagensUpload.push({ url_arquivo: img.url_arquivo, tipo: img.campo_key });
      }

      // Upload das novas
      for (const img of imagens) {
        try {
          const result = await apiUploadImagem(img.file_uri, token);
          imagensUpload.push({ url_arquivo: result.url_arquivo, tipo: img.campo_key });
          await db.runAsync(
            'UPDATE imagens_offline SET url_arquivo = ?, sincronizado = 1 WHERE local_id = ?',
            [result.url_arquivo, img.local_id],
          );
        } catch (err) {
          console.warn('Falha no upload da imagem:', img.local_id, err);
        }
      }

      // 2. Se a entrega já tem server_id, é uma finalização
      if (entrega.server_id) {
        await apiFinalizarEntrega(entrega.server_id, {
          imagens: imagensUpload,
          latitude: entrega.latitude,
          longitude: entrega.longitude,
          campos_ausentes: entrega.campos_ausentes ? entrega.campos_ausentes.split(',') : undefined,
        }, token);
      } else {
        // 3. Determinar se a entrega está completa para enviar como ENVIADO
        // Busca campos obrigatórios do cache
        const camposObrig = await db.getAllAsync<any>(
          'SELECT key FROM campos_imagem WHERE obrigatorio = 1',
        );
        const keysObrig = new Set(camposObrig.map((c: any) => c.key));
        const keysEnviadas = new Set(imagensUpload.map((i) => i.tipo));
        const camposAusentes = entrega.campos_ausentes ? entrega.campos_ausentes.split(',') : [];
        const camposAusentesSet = new Set(camposAusentes);

        // Entrega completa = todos os campos obrigatórios têm imagem OU foram marcados como ausentes
        // + tem localização válida
        const todosObrigOk = [...keysObrig].every(
          (k) => keysEnviadas.has(k) || camposAusentesSet.has(k),
        );
        const temLocalizacao = entrega.latitude !== 0 || entrega.longitude !== 0;
        const entregaCompleta = todosObrigOk && temLocalizacao && imagensUpload.length > 0;

        // Se completa, envia como ENVIADO; senão mantém PENDENTE
        const statusFinal = entregaCompleta ? 'ENVIADO' : 'PENDENTE';

        const payload: CriarEntregaPayload = {
          chave_nfe: entrega.chave_nfe,
          latitude: entrega.latitude,
          longitude: entrega.longitude,
          imagens: imagensUpload,
          status: statusFinal,
          campos_ausentes: camposAusentes.length ? camposAusentes : undefined,
        };

        const result = await apiCriarEntrega(payload, token);
        await db.runAsync(
          'UPDATE entregas_offline SET server_id = ? WHERE local_id = ?',
          [result.id, entrega.local_id],
        );
      }

      // 4. Marcar como sincronizado
      await db.runAsync(
        'UPDATE entregas_offline SET sincronizado = 1 WHERE local_id = ?',
        [entrega.local_id],
      );
      sucesso++;
    } catch (err) {
      console.warn('Falha ao sincronizar entrega:', entrega.local_id, err);
      falhas++;
    }
  }

  // Limpar entregas sincronizadas com mais de 24h
  const ontem = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  await db.runAsync(
    'DELETE FROM entregas_offline WHERE sincronizado = 1 AND criado_em < ?',
    [ontem],
  );

  return { sucesso, falhas };
}

// ─── Cache de entregas do servidor ───────────────────────────────────────────

export async function cachearEntregas(entregas: EntregaResponse[]): Promise<void> {
  const db = await getDatabase();
  const agora = new Date().toISOString();

  // Limpa o cache antigo e substitui com dados frescos
  // Isso evita que entregas já finalizadas/enviadas fiquem no cache como "PENDENTE"
  await db.runAsync('DELETE FROM entregas_cache');

  for (const e of entregas) {
    await db.runAsync(
      `INSERT INTO entregas_cache (id, data, atualizado_em) VALUES (?, ?, ?)`,
      [e.id, JSON.stringify(e), agora],
    );
  }
}

export async function obterEntregasCache(): Promise<EntregaResponse[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>('SELECT data FROM entregas_cache ORDER BY atualizado_em DESC');
  return rows.map((r) => JSON.parse(r.data));
}

export async function invalidarCacheEntrega(entregaId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM entregas_cache WHERE id = ?', [entregaId]);
}

// ─── Cache de campos imagem ──────────────────────────────────────────────────

export async function cachearCamposImagem(campos: { id: string; key: string; label: string; obrigatorio: boolean; ordem: number; ativo: boolean }[]): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM campos_imagem');
  for (const c of campos) {
    await db.runAsync(
      'INSERT INTO campos_imagem (id, key, label, obrigatorio, ordem, ativo) VALUES (?, ?, ?, ?, ?, ?)',
      [c.id, c.key, c.label, c.obrigatorio ? 1 : 0, c.ordem, c.ativo ? 1 : 0],
    );
  }
}

export async function obterCamposImagemCache(): Promise<{ id: string; key: string; label: string; obrigatorio: boolean; ordem: number; ativo: boolean }[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>('SELECT * FROM campos_imagem ORDER BY ordem ASC');
  return rows.map((r) => ({ ...r, obrigatorio: !!r.obrigatorio, ativo: !!r.ativo }));
}
