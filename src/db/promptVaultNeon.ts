import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import type { PromptVaultItem } from "@/domain/studioAssets";
import { requireDatabaseUrlOrNull } from "@/db/status";
import { ensureStudioSchema, isNeonEnabled } from "@/db/neon";

const VAULT_KEY = "prompt-vault.json";

let sql: NeonQueryFunction<false, false> | null = null;
let sqlUrl: string | null = null;

function getSql() {
  const url = requireDatabaseUrlOrNull();
  if (!url) throw new Error("DATABASE_URL não configurada.");
  if (!sql || sqlUrl !== url) {
    sql = neon(url, { fetchOptions: { cache: "no-store" } });
    sqlUrl = url;
  }
  return sql;
}

async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let last: unknown;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await fn();
    } catch (err) {
      last = err;
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, 250 * (i + 1)));
      }
    }
  }
  const message =
    last instanceof Error
      ? last.message
      : typeof last === "string"
        ? last
        : "Falha ao conectar no Neon.";
  throw new Error(message);
}

export function isNeonQuotaError(err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  return /402|quota|exceeded|data transfer/i.test(msg);
}

function normalizeItem(raw: unknown): PromptVaultItem {
  const item = (raw || {}) as Partial<PromptVaultItem>;
  return {
    id: String(item.id || ""),
    area: (item.area || "comandos") as PromptVaultItem["area"],
    title: String(item.title || ""),
    purpose: String(item.purpose || ""),
    body: String(item.body || ""),
    tags: Array.isArray(item.tags)
      ? item.tags.map((t) => String(t)).filter(Boolean)
      : [],
    createdAt: String(item.createdAt || ""),
    updatedAt: String(item.updatedAt || ""),
  };
}

export type PromptVaultMeta = {
  total: number;
  bytes: number | null;
  updatedAt: string | null;
  areas: { area: string; count: number }[];
};

/** Meta leve — não baixa o blob inteiro. */
export async function neonPromptVaultMeta(): Promise<PromptVaultMeta> {
  if (!isNeonEnabled()) {
    return { total: 0, bytes: null, updatedAt: null, areas: [] };
  }
  await ensureStudioSchema();
  return withRetry(async () => {
    const db = getSql();
    const head = await db`
      SELECT
        updated_at,
        CASE WHEN jsonb_typeof(value) = 'array'
          THEN jsonb_array_length(value) ELSE 0 END AS n,
        pg_column_size(value) AS bytes
      FROM studio_kv
      WHERE key = ${VAULT_KEY}
      LIMIT 1
    `;
    if (!head[0]) {
      return { total: 0, bytes: null, updatedAt: null, areas: [] };
    }
    const areas = await db`
      SELECT
        coalesce(nullif(elem->>'area', ''), 'comandos') AS area,
        count(*)::int AS count
      FROM studio_kv,
           jsonb_array_elements(value) AS elem
      WHERE key = ${VAULT_KEY}
      GROUP BY 1
      ORDER BY count DESC
    `;
    return {
      total: Number(head[0].n || 0),
      bytes: head[0].bytes == null ? null : Number(head[0].bytes),
      updatedAt: head[0].updated_at
        ? new Date(head[0].updated_at as string).toISOString()
        : null,
      areas: areas.map((row) => ({
        area: String(row.area || "comandos"),
        count: Number(row.count || 0),
      })),
    };
  });
}

export type PromptVaultPageOpts = {
  area?: string | null;
  q?: string | null;
  limit?: number;
  offset?: number;
  /** summary = body truncado (lista); full = body completo */
  fields?: "summary" | "full";
};

export type PromptVaultPage = {
  prompts: PromptVaultItem[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
};

/** Página via SQL — evita serializar 1000+ prompts de uma vez. */
export async function neonPromptVaultPage(
  opts: PromptVaultPageOpts = {},
): Promise<PromptVaultPage> {
  if (!isNeonEnabled()) {
    return { prompts: [], total: 0, limit: 0, offset: 0, hasMore: false };
  }
  await ensureStudioSchema();
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
  const offset = Math.max(opts.offset ?? 0, 0);
  const area = opts.area?.trim().toLowerCase() || null;
  const q = opts.q?.trim().toLowerCase() || null;
  const fields = opts.fields === "full" ? "full" : "summary";

  return withRetry(async () => {
    const db = getSql();

    const countRows = await db`
      SELECT count(*)::int AS n
      FROM studio_kv,
           jsonb_array_elements(value) AS elem
      WHERE key = ${VAULT_KEY}
        AND (${area}::text IS NULL OR coalesce(nullif(elem->>'area', ''), 'comandos') = ${area})
        AND (
          ${q}::text IS NULL
          OR lower(coalesce(elem->>'title', '')) LIKE ${q ? `%${q}%` : "%"}
          OR lower(coalesce(elem->>'purpose', '')) LIKE ${q ? `%${q}%` : "%"}
          OR lower(coalesce(elem->>'body', '')) LIKE ${q ? `%${q}%` : "%"}
        )
    `;
    const total = Number(countRows[0]?.n || 0);

    const rows =
      fields === "full"
        ? await db`
            SELECT elem AS item
            FROM studio_kv,
                 jsonb_array_elements(value) AS elem
            WHERE key = ${VAULT_KEY}
              AND (${area}::text IS NULL OR coalesce(nullif(elem->>'area', ''), 'comandos') = ${area})
              AND (
                ${q}::text IS NULL
                OR lower(coalesce(elem->>'title', '')) LIKE ${q ? `%${q}%` : "%"}
                OR lower(coalesce(elem->>'purpose', '')) LIKE ${q ? `%${q}%` : "%"}
                OR lower(coalesce(elem->>'body', '')) LIKE ${q ? `%${q}%` : "%"}
              )
            ORDER BY coalesce(elem->>'updatedAt', '') DESC
            LIMIT ${limit} OFFSET ${offset}
          `
        : await db`
            SELECT jsonb_build_object(
              'id', elem->>'id',
              'area', coalesce(nullif(elem->>'area', ''), 'comandos'),
              'title', elem->>'title',
              'purpose', elem->>'purpose',
              'tags', coalesce(elem->'tags', '[]'::jsonb),
              'body', left(coalesce(elem->>'body', ''), 220),
              'createdAt', elem->>'createdAt',
              'updatedAt', elem->>'updatedAt'
            ) AS item
            FROM studio_kv,
                 jsonb_array_elements(value) AS elem
            WHERE key = ${VAULT_KEY}
              AND (${area}::text IS NULL OR coalesce(nullif(elem->>'area', ''), 'comandos') = ${area})
              AND (
                ${q}::text IS NULL
                OR lower(coalesce(elem->>'title', '')) LIKE ${q ? `%${q}%` : "%"}
                OR lower(coalesce(elem->>'purpose', '')) LIKE ${q ? `%${q}%` : "%"}
                OR lower(coalesce(elem->>'body', '')) LIKE ${q ? `%${q}%` : "%"}
              )
            ORDER BY coalesce(elem->>'updatedAt', '') DESC
            LIMIT ${limit} OFFSET ${offset}
          `;

    const prompts = rows.map((row) => normalizeItem(row.item));
    return {
      prompts,
      total,
      limit,
      offset,
      hasMore: offset + prompts.length < total,
    };
  });
}

export async function neonPromptVaultGetById(
  id: string,
): Promise<PromptVaultItem | null> {
  if (!isNeonEnabled()) return null;
  await ensureStudioSchema();
  return withRetry(async () => {
    const db = getSql();
    const rows = await db`
      SELECT elem AS item
      FROM studio_kv,
           jsonb_array_elements(value) AS elem
      WHERE key = ${VAULT_KEY}
        AND elem->>'id' = ${id}
      LIMIT 1
    `;
    if (!rows[0]) return null;
    return normalizeItem(rows[0].item);
  });
}

/** Append atômico — evita condição de corrida do read-modify-write. */
export async function neonPromptVaultAppend(
  item: PromptVaultItem,
): Promise<PromptVaultItem> {
  if (!isNeonEnabled()) throw new Error("Neon não configurado.");
  await ensureStudioSchema();
  return withRetry(async () => {
    const db = getSql();
    const payload = JSON.stringify([item]);
    await db`
      INSERT INTO studio_kv (key, value, updated_at)
      VALUES (${VAULT_KEY}, ${payload}::jsonb, NOW())
      ON CONFLICT (key) DO UPDATE
      SET value = studio_kv.value || EXCLUDED.value,
          updated_at = NOW()
    `;
    return item;
  });
}

export async function neonPromptVaultReplaceItem(
  item: PromptVaultItem,
): Promise<PromptVaultItem> {
  if (!isNeonEnabled()) throw new Error("Neon não configurado.");
  await ensureStudioSchema();
  return withRetry(async () => {
    const db = getSql();
    const payload = JSON.stringify(item);
    await db`
      UPDATE studio_kv
      SET value = (
            SELECT coalesce(jsonb_agg(
              CASE
                WHEN elem->>'id' = ${item.id} THEN ${payload}::jsonb
                ELSE elem
              END
              ORDER BY ordinality
            ), '[]'::jsonb)
            FROM jsonb_array_elements(value) WITH ORDINALITY AS t(elem, ordinality)
          ),
          updated_at = NOW()
      WHERE key = ${VAULT_KEY}
    `;
    return item;
  });
}

export async function neonPromptVaultRemove(id: string): Promise<boolean> {
  if (!isNeonEnabled()) return false;
  await ensureStudioSchema();
  return withRetry(async () => {
    const db = getSql();
    const before = await db`
      SELECT count(*)::int AS n
      FROM studio_kv, jsonb_array_elements(value) AS elem
      WHERE key = ${VAULT_KEY} AND elem->>'id' = ${id}
    `;
    if (!Number(before[0]?.n)) return false;
    await db`
      UPDATE studio_kv
      SET value = (
            SELECT coalesce(jsonb_agg(elem ORDER BY ordinality), '[]'::jsonb)
            FROM jsonb_array_elements(value) WITH ORDINALITY AS t(elem, ordinality)
            WHERE elem->>'id' <> ${id}
          ),
          updated_at = NOW()
      WHERE key = ${VAULT_KEY}
    `;
    return true;
  });
}
