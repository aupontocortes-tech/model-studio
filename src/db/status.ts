/** Resolve e sanitiza a connection string do Postgres/Neon. */

const ENV_KEYS = [
  "DATABASE_URL",
  "POSTGRES_URL",
  "POSTGRES_PRISMA_URL",
  "DATABASE_URL_UNPOOLED",
  "POSTGRES_URL_NON_POOLING",
] as const;

export function requireDatabaseUrlOrNull(): string | null {
  for (const key of ENV_KEYS) {
    const raw = process.env[key];
    if (!raw) continue;
    const url = sanitizeDatabaseUrl(raw);
    if (url) return url;
  }
  return null;
}

export function sanitizeDatabaseUrl(raw: string): string | null {
  let url = raw.trim();
  if (
    (url.startsWith('"') && url.endsWith('"')) ||
    (url.startsWith("'") && url.endsWith("'"))
  ) {
    url = url.slice(1, -1).trim();
  }
  if (!url || /user:pass@host/i.test(url)) return null;
  if (!/^postgres(ql)?:\/\//i.test(url)) return null;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    if (
      !host ||
      host === "host" ||
      host === "localhost" ||
      host === "example.com" ||
      host === "xxx"
    ) {
      return null;
    }
  } catch {
    return null;
  }
  return url;
}

export function databaseUrlHost(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

/** Estado do banco Neon. Sem DATABASE_URL as APIs studio usam JSON local. */
export function getDatabaseStatus(): {
  configured: boolean;
  message: string;
  mode: "neon" | "local-json";
  host?: string | null;
} {
  const raw = process.env.DATABASE_URL?.trim() || process.env.POSTGRES_URL?.trim();
  const url = requireDatabaseUrlOrNull();
  if (!url) {
    const looksPlaceholder =
      raw &&
      (/@HOST[/:]/i.test(raw) || /user:pass@host/i.test(raw) || /@host[/:]/i.test(raw));
    return {
      configured: false,
      mode: "local-json",
      host: null,
      message: looksPlaceholder
        ? "DATABASE_URL na Vercel ainda é placeholder (host HOST). Cole a connection string real do Neon (Connect → Connection string, com -pooler)."
        : "DATABASE_URL não configurada. Persistência ativa em JSON local (/data). Para Neon/PostgreSQL, defina DATABASE_URL no .env.local / Vercel.",
    };
  }
  const host = databaseUrlHost(url);
  return {
    configured: true,
    mode: "neon",
    host,
    message: `DATABASE_URL detectada (${host || "host?"}). Studio criativo persiste no Neon (PostgreSQL).`,
  };
}
