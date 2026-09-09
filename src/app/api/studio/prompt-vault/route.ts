import type { PromptVaultArea, PromptVaultItem } from "@/domain/studioAssets";
import { isNeonEnabled } from "@/db/neon";
import {
  isNeonQuotaError,
  neonPromptVaultAppend,
  neonPromptVaultMeta,
  neonPromptVaultPage,
} from "@/db/promptVaultNeon";
import { jsonError, jsonOk, createId, nowIso } from "@/lib/studioCrud";
import { promptVaultRepo } from "@/storage/studioRepos";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function parseTags(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw
      .map((t) => String(t).trim())
      .filter(Boolean)
      .slice(0, 12);
  }
  if (typeof raw === "string") {
    return raw
      .split(/[,;#]+/)
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 12);
  }
  return [];
}

function normalizeArea(raw: unknown, fallback: PromptVaultArea = "comandos") {
  if (typeof raw !== "string") return fallback;
  const area = raw.trim().toLowerCase();
  return area || fallback;
}

function withArea(item: PromptVaultItem): PromptVaultItem {
  return {
    ...item,
    area: item.area || "comandos",
    tags: Array.isArray(item.tags) ? item.tags : [],
  };
}

function quotaMessage() {
  return "Banco temporariamente indisponível (cota de transferência do Neon). Os prompts NÃO foram apagados — aguarde o reset da cota ou faça upgrade no Neon.";
}

function pageFromLocal(
  items: PromptVaultItem[],
  opts: {
    area: string | null;
    q: string | null;
    limit: number;
    offset: number;
    fields: "summary" | "full";
  },
) {
  let filtered = items.map(withArea);
  if (opts.area) {
    filtered = filtered.filter(
      (item) => (item.area || "comandos") === opts.area,
    );
  }
  if (opts.q) {
    const q = opts.q;
    filtered = filtered.filter((item) => {
      const hay =
        `${item.title} ${item.purpose} ${item.body} ${item.tags.join(" ")}`.toLowerCase();
      return hay.includes(q);
    });
  }
  filtered.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const total = filtered.length;
  const slice = filtered.slice(opts.offset, opts.offset + opts.limit);
  const prompts =
    opts.fields === "full"
      ? slice
      : slice.map((item) => ({
          ...item,
          body:
            item.body.length > 220 ? `${item.body.slice(0, 220)}…` : item.body,
        }));
  return {
    prompts,
    total,
    limit: opts.limit,
    offset: opts.offset,
    hasMore: opts.offset + prompts.length < total,
  };
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const wantMeta = url.searchParams.get("meta") === "1";
    const area = url.searchParams.get("area")?.trim().toLowerCase() || null;
    const q = url.searchParams.get("q")?.trim().toLowerCase() || null;
    const fields =
      url.searchParams.get("fields") === "full" ? "full" : "summary";
    const limit = Number(url.searchParams.get("limit") || 50);
    const offset = Number(url.searchParams.get("offset") || 0);

    if (wantMeta) {
      if (isNeonEnabled()) {
        try {
          const meta = await neonPromptVaultMeta();
          return jsonOk({ meta });
        } catch (err) {
          if (isNeonQuotaError(err)) {
            const local = (await promptVaultRepo.all()).map(withArea);
            const areas = new Map<string, number>();
            for (const item of local) {
              const key = (item.area || "comandos").toLowerCase();
              areas.set(key, (areas.get(key) || 0) + 1);
            }
            return jsonOk({
              meta: {
                total: local.length,
                bytes: null,
                updatedAt: null,
                areas: [...areas.entries()].map(([a, count]) => ({
                  area: a,
                  count,
                })),
                source: "local-fallback",
                warning: quotaMessage(),
              },
            });
          }
          throw err;
        }
      }
      const local = (await promptVaultRepo.all()).map(withArea);
      const areas = new Map<string, number>();
      for (const item of local) {
        const key = (item.area || "comandos").toLowerCase();
        areas.set(key, (areas.get(key) || 0) + 1);
      }
      return jsonOk({
        meta: {
          total: local.length,
          bytes: null,
          updatedAt: null,
          areas: [...areas.entries()].map(([a, count]) => ({
            area: a,
            count,
          })),
          source: "local",
        },
      });
    }

    if (isNeonEnabled()) {
      try {
        const page = await neonPromptVaultPage({
          area,
          q,
          limit,
          offset,
          fields,
        });
        return jsonOk(page);
      } catch (err) {
        if (!isNeonQuotaError(err)) throw err;
        // Fallback local (dev) — em produção sem arquivo local, avisa sem inventar dados.
        try {
          const local = (await promptVaultRepo.all()).map(withArea);
          if (local.length > 0) {
            return jsonOk({
              ...pageFromLocal(local, {
                area,
                q,
                limit: Math.min(Math.max(limit || 50, 1), 200),
                offset: Math.max(offset || 0, 0),
                fields,
              }),
              warning: quotaMessage(),
              source: "local-fallback",
            });
          }
        } catch {
          /* ignore */
        }
        return jsonError(quotaMessage(), 503);
      }
    }

    const local = (await promptVaultRepo.all()).map(withArea);
    return jsonOk(
      pageFromLocal(local, {
        area,
        q,
        limit: Math.min(Math.max(limit || 50, 1), 200),
        offset: Math.max(offset || 0, 0),
        fields,
      }),
    );
  } catch (err) {
    console.error("[prompt-vault GET]", err);
    const msg = err instanceof Error ? err.message : "Falha ao listar prompts.";
    if (isNeonQuotaError(err)) return jsonError(quotaMessage(), 503);
    return jsonError(msg, 500);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      title?: string;
      purpose?: string;
      body?: string;
      tags?: unknown;
      area?: string;
    };
    const title = body.title?.trim() || "";
    const promptBody = body.body?.trim() || "";
    if (!title) return jsonError("Dê um nome ao comando.");
    if (!promptBody) return jsonError("Cole o texto do comando.");

    const now = nowIso();
    const item: PromptVaultItem = {
      id: createId("pvault"),
      area: normalizeArea(body.area, "comandos"),
      title,
      purpose: body.purpose?.trim() || "",
      body: promptBody,
      tags: parseTags(body.tags),
      createdAt: now,
      updatedAt: now,
    };

    if (isNeonEnabled()) {
      try {
        await neonPromptVaultAppend(item);
        return jsonOk({ prompt: item }, { status: 201 });
      } catch (err) {
        if (!isNeonQuotaError(err)) throw err;
        // fallback local
        await promptVaultRepo.upsert(item);
        return jsonOk(
          { prompt: item, warning: quotaMessage(), source: "local-fallback" },
          { status: 201 },
        );
      }
    }

    await promptVaultRepo.upsert(item);
    return jsonOk({ prompt: item }, { status: 201 });
  } catch (err) {
    console.error("[prompt-vault POST]", err);
    const msg = err instanceof Error ? err.message : "Falha ao salvar prompt.";
    if (isNeonQuotaError(err)) return jsonError(quotaMessage(), 503);
    return jsonError(msg, 500);
  }
}
