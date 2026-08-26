import { jsonError, jsonOk, nowIso } from "@/lib/studioCrud";
import { studioSceneRepo } from "@/storage/studioRepos";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const existing = await studioSceneRepo.get(id);
  if (!existing) return jsonError("Cenário não encontrado.", 404);
  const body = (await request.json()) as Record<string, unknown>;
  const updated = await studioSceneRepo.upsert({
    ...existing,
    name: typeof body.name === "string" ? body.name.trim() : existing.name,
    description:
      typeof body.description === "string"
        ? body.description.trim()
        : existing.description,
    lighting:
      typeof body.lighting === "string"
        ? body.lighting.trim() || undefined
        : existing.lighting,
    imageUrl:
      typeof body.imageUrl === "string" ? body.imageUrl : existing.imageUrl,
    inSceneImageUrl:
      typeof body.inSceneImageUrl === "string"
        ? body.inSceneImageUrl
        : existing.inSceneImageUrl,
    updatedAt: nowIso(),
  });
  return jsonOk({ scene: updated });
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!(await studioSceneRepo.get(id))) {
    return jsonError("Cenário não encontrado.", 404);
  }
  await studioSceneRepo.remove(id);
  return jsonOk({ ok: true });
}
