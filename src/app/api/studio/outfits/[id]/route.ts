import { jsonError, jsonOk, nowIso } from "@/lib/studioCrud";
import { studioOutfitRepo } from "@/storage/studioRepos";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const existing = await studioOutfitRepo.get(id);
  if (!existing) return jsonError("Roupa não encontrada.", 404);
  const body = (await request.json()) as Record<string, unknown>;
  const updated = await studioOutfitRepo.upsert({
    ...existing,
    name:
      typeof body.name === "string" ? body.name.trim() : existing.name,
    description:
      typeof body.description === "string"
        ? body.description.trim()
        : existing.description,
    colors:
      typeof body.colors === "string"
        ? body.colors.trim() || undefined
        : existing.colors,
    imageUrl:
      typeof body.imageUrl === "string" ? body.imageUrl : existing.imageUrl,
    wornImageUrl:
      typeof body.wornImageUrl === "string"
        ? body.wornImageUrl
        : existing.wornImageUrl,
    updatedAt: nowIso(),
  });
  return jsonOk({ outfit: updated });
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!(await studioOutfitRepo.get(id))) {
    return jsonError("Roupa não encontrada.", 404);
  }
  await studioOutfitRepo.remove(id);
  return jsonOk({ ok: true });
}
