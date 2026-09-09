import { isNeonEnabled } from "@/db/neon";
import {
  isNeonQuotaError,
  neonPromptVaultGetById,
  neonPromptVaultRemove,
  neonPromptVaultReplaceItem,
} from "@/db/promptVaultNeon";
import { jsonError, jsonOk, nowIso } from "@/lib/studioCrud";
import { promptVaultRepo } from "@/storage/studioRepos";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

function parseTags(raw: unknown, fallback: string[]): string[] {
  if (raw === undefined) return fallback;
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
  return fallback;
}

function quotaMessage() {
  return "Banco temporariamente indisponível (cota de transferência do Neon). Os prompts NÃO foram apagados.";
}

export async function GET(_request: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    if (isNeonEnabled()) {
      try {
        const item = await neonPromptVaultGetById(id);
        if (!item) return jsonError("Prompt não encontrado.", 404);
        return jsonOk({ prompt: item });
      } catch (err) {
        if (!isNeonQuotaError(err)) throw err;
        const local = await promptVaultRepo.get(id);
        if (local) return jsonOk({ prompt: local, source: "local-fallback" });
        return jsonError(quotaMessage(), 503);
      }
    }
    const item = await promptVaultRepo.get(id);
    if (!item) return jsonError("Prompt não encontrado.", 404);
    return jsonOk({ prompt: item });
  } catch (err) {
    console.error("[prompt-vault GET id]", err);
    return jsonError(
      err instanceof Error ? err.message : "Falha ao carregar prompt.",
      500,
    );
  }
}

export async function PATCH(request: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    let existing =
      isNeonEnabled()
        ? await neonPromptVaultGetById(id).catch(async (err) => {
            if (!isNeonQuotaError(err)) throw err;
            return (await promptVaultRepo.get(id)) || null;
          })
        : (await promptVaultRepo.get(id)) || null;

    if (!existing && !isNeonEnabled()) {
      return jsonError("Prompt não encontrado.", 404);
    }
    if (!existing) {
      existing = (await promptVaultRepo.get(id)) || null;
    }
    if (!existing) return jsonError("Prompt não encontrado.", 404);

    const body = (await request.json()) as Record<string, unknown>;
    const title =
      typeof body.title === "string" ? body.title.trim() : existing.title;
    const promptBody =
      typeof body.body === "string" ? body.body.trim() : existing.body;
    if (!title) return jsonError("Dê um nome ao prompt.");
    if (!promptBody) return jsonError("Cole o texto do prompt.");

    const updated = {
      ...existing,
      area:
        typeof body.area === "string" && body.area.trim()
          ? body.area.trim().toLowerCase()
          : existing.area || "comandos",
      title,
      purpose:
        typeof body.purpose === "string"
          ? body.purpose.trim()
          : existing.purpose,
      body: promptBody,
      tags: parseTags(body.tags, existing.tags),
      updatedAt: nowIso(),
    };

    if (isNeonEnabled()) {
      try {
        await neonPromptVaultReplaceItem(updated);
        return jsonOk({ prompt: updated });
      } catch (err) {
        if (!isNeonQuotaError(err)) throw err;
        await promptVaultRepo.upsert(updated);
        return jsonOk({
          prompt: updated,
          warning: quotaMessage(),
          source: "local-fallback",
        });
      }
    }

    await promptVaultRepo.upsert(updated);
    return jsonOk({ prompt: updated });
  } catch (err) {
    console.error("[prompt-vault PATCH]", err);
    if (isNeonQuotaError(err)) return jsonError(quotaMessage(), 503);
    return jsonError(
      err instanceof Error ? err.message : "Falha ao atualizar prompt.",
      500,
    );
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    if (isNeonEnabled()) {
      try {
        const ok = await neonPromptVaultRemove(id);
        if (!ok) return jsonError("Prompt não encontrado.", 404);
        return jsonOk({ ok: true });
      } catch (err) {
        if (!isNeonQuotaError(err)) throw err;
        if (!(await promptVaultRepo.get(id))) {
          return jsonError(quotaMessage(), 503);
        }
        await promptVaultRepo.remove(id);
        return jsonOk({ ok: true, source: "local-fallback" });
      }
    }
    if (!(await promptVaultRepo.get(id))) {
      return jsonError("Prompt não encontrado.", 404);
    }
    await promptVaultRepo.remove(id);
    return jsonOk({ ok: true });
  } catch (err) {
    console.error("[prompt-vault DELETE]", err);
    if (isNeonQuotaError(err)) return jsonError(quotaMessage(), 503);
    return jsonError(
      err instanceof Error ? err.message : "Falha ao excluir prompt.",
      500,
    );
  }
}
