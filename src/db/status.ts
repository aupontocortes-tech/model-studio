import { getEnv } from "@/lib/env";

/** Estado do banco Neon. Sem DATABASE_URL as APIs studio usam JSON local. */
export function getDatabaseStatus(): {
  configured: boolean;
  message: string;
  mode: "neon" | "local-json";
} {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    return {
      configured: false,
      mode: "local-json",
      message:
        "DATABASE_URL não configurada. Persistência ativa em JSON local (/data). Para Neon/PostgreSQL, defina DATABASE_URL no .env.local.",
    };
  }
  return {
    configured: true,
    mode: "neon",
    message:
      "DATABASE_URL detectada. Studio criativo persiste no Neon (PostgreSQL).",
  };
}

export function requireDatabaseUrlOrNull(): string | null {
  return process.env.DATABASE_URL?.trim() || null;
}

export function dataDirHint() {
  return getEnv().dataDir;
}
