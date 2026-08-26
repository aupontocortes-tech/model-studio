import { jsonError, jsonOk, nowIso } from "@/lib/studioCrud";
import { studioScriptRepo } from "@/storage/studioRepos";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const existing = await studioScriptRepo.get(id);
  if (!existing) return jsonError("Roteiro não encontrado.", 404);
  const body = (await request.json()) as Record<string, unknown>;
  const updated = await studioScriptRepo.upsert({
    ...existing,
    name: typeof body.name === "string" ? body.name.trim() : existing.name,
    hook: typeof body.hook === "string" ? body.hook.trim() : existing.hook,
    body: typeof body.body === "string" ? body.body.trim() : existing.body,
    cta:
      typeof body.cta === "string"
        ? body.cta.trim() || undefined
        : existing.cta,
    updatedAt: nowIso(),
  });
  return jsonOk({ script: updated });
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!(await studioScriptRepo.get(id))) {
    return jsonError("Roteiro não encontrado.", 404);
  }
  await studioScriptRepo.remove(id);
  return jsonOk({ ok: true });
}
