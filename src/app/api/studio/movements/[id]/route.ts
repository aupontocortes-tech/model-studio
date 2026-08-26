import { jsonError, jsonOk, nowIso } from "@/lib/studioCrud";
import { studioMovementRepo } from "@/storage/studioRepos";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const existing = await studioMovementRepo.get(id);
  if (!existing) return jsonError("Movimento não encontrado.", 404);
  const body = (await request.json()) as Record<string, unknown>;
  const updated = await studioMovementRepo.upsert({
    ...existing,
    name: typeof body.name === "string" ? body.name.trim() : existing.name,
    description:
      typeof body.description === "string"
        ? body.description.trim()
        : existing.description,
    cameraHint:
      typeof body.cameraHint === "string"
        ? body.cameraHint.trim() || undefined
        : existing.cameraHint,
    updatedAt: nowIso(),
  });
  return jsonOk({ movement: updated });
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!(await studioMovementRepo.get(id))) {
    return jsonError("Movimento não encontrado.", 404);
  }
  await studioMovementRepo.remove(id);
  return jsonOk({ ok: true });
}
