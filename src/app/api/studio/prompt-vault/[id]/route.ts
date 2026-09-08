import { jsonError, jsonOk, nowIso } from "@/lib/studioCrud";
import { promptVaultRepo } from "@/storage/studioRepos";

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

export async function PATCH(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const existing = await promptVaultRepo.get(id);
  if (!existing) return jsonError("Prompt não encontrado.", 404);

  const body = (await request.json()) as Record<string, unknown>;
  const title =
    typeof body.title === "string" ? body.title.trim() : existing.title;
  const promptBody =
    typeof body.body === "string" ? body.body.trim() : existing.body;
  if (!title) return jsonError("Dê um nome ao prompt.");
  if (!promptBody) return jsonError("Cole o texto do prompt.");

  const updated = await promptVaultRepo.upsert({
    ...existing,
    title,
    purpose:
      typeof body.purpose === "string"
        ? body.purpose.trim()
        : existing.purpose,
    body: promptBody,
    tags: parseTags(body.tags, existing.tags),
    updatedAt: nowIso(),
  });
  return jsonOk({ prompt: updated });
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!(await promptVaultRepo.get(id))) {
    return jsonError("Prompt não encontrado.", 404);
  }
  await promptVaultRepo.remove(id);
  return jsonOk({ ok: true });
}
