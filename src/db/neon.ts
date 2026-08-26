import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { requireDatabaseUrlOrNull } from "@/db/status";

let sql: NeonQueryFunction<false, false> | null = null;
let sqlUrl: string | null = null;
let schemaReady: Promise<void> | null = null;

export function isNeonEnabled(): boolean {
  return Boolean(requireDatabaseUrlOrNull());
}

function getSql() {
  const url = requireDatabaseUrlOrNull();
  if (!url) throw new Error("DATABASE_URL não configurada.");
  if (!sql || sqlUrl !== url) {
    sql = neon(url, {
      fetchOptions: { cache: "no-store" },
    });
    sqlUrl = url;
    schemaReady = null;
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
  throw new Error(
    `${message} Confira DATABASE_URL na Vercel (connection string com -pooler, sslmode=require).`,
  );
}

/** Tabelas: KV das coleções JSON + arquivos binários (fotos/áudio). */
export async function ensureStudioSchema(): Promise<void> {
  if (!isNeonEnabled()) return;
  if (!schemaReady) {
    schemaReady = withRetry(async () => {
      const db = getSql();
      await db`
        CREATE TABLE IF NOT EXISTS studio_kv (
          key TEXT PRIMARY KEY,
          value JSONB NOT NULL DEFAULT '[]'::jsonb,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      await db`
        CREATE TABLE IF NOT EXISTS studio_files (
          path TEXT PRIMARY KEY,
          content BYTEA NOT NULL,
          content_type TEXT NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
    }).catch((err) => {
      schemaReady = null;
      throw err;
    });
  }
  await schemaReady;
}

export async function neonReadCollection<T>(key: string): Promise<T[]> {
  await ensureStudioSchema();
  return withRetry(async () => {
    const db = getSql();
    const rows = await db`
      SELECT value FROM studio_kv WHERE key = ${key} LIMIT 1
    `;
    if (!rows[0]) return [];
    const value = rows[0].value;
    return Array.isArray(value) ? (value as T[]) : [];
  });
}

export async function neonWriteCollection<T>(
  key: string,
  items: T[],
): Promise<void> {
  await ensureStudioSchema();
  await withRetry(async () => {
    const db = getSql();
    const value = items as unknown as Record<string, unknown>[];
    await db`
      INSERT INTO studio_kv (key, value, updated_at)
      VALUES (${key}, ${value}, NOW())
      ON CONFLICT (key) DO UPDATE
      SET value = EXCLUDED.value, updated_at = NOW()
    `;
  });
}

export async function neonSaveFile(opts: {
  relativePath: string;
  buffer: Buffer;
  contentType: string;
}): Promise<void> {
  await ensureStudioSchema();
  await withRetry(async () => {
    const db = getSql();
    const pathKey = opts.relativePath.replace(/\\/g, "/");
    const bytes = Uint8Array.from(opts.buffer);
    await db`
      INSERT INTO studio_files (path, content, content_type, updated_at)
      VALUES (${pathKey}, ${bytes}, ${opts.contentType}, NOW())
      ON CONFLICT (path) DO UPDATE
      SET content = EXCLUDED.content,
          content_type = EXCLUDED.content_type,
          updated_at = NOW()
    `;
  });
}

export async function neonReadFile(
  relativePath: string,
): Promise<{ buffer: Buffer; contentType: string } | null> {
  await ensureStudioSchema();
  return withRetry(async () => {
    const db = getSql();
    const pathKey = relativePath.replace(/\\/g, "/");
    const rows = await db`
      SELECT content, content_type FROM studio_files WHERE path = ${pathKey} LIMIT 1
    `;
    const row = rows[0];
    if (!row) return null;
    const content = row.content;
    let buffer: Buffer;
    if (Buffer.isBuffer(content)) {
      buffer = content;
    } else if (content instanceof Uint8Array) {
      buffer = Buffer.from(content);
    } else if (typeof content === "string") {
      buffer = Buffer.from(content, "base64");
    } else {
      buffer = Buffer.from(new Uint8Array(content as ArrayBuffer));
    }
    return {
      buffer,
      contentType: String(row.content_type || "application/octet-stream"),
    };
  });
}

export async function neonPing(): Promise<{ ok: boolean; detail: string }> {
  if (!isNeonEnabled()) return { ok: false, detail: "sem DATABASE_URL" };
  try {
    await withRetry(async () => {
      const db = getSql();
      await db`SELECT 1 AS ok`;
    }, 2);
    return { ok: true, detail: "ok" };
  } catch (e) {
    return {
      ok: false,
      detail: e instanceof Error ? e.message : "falha",
    };
  }
}
