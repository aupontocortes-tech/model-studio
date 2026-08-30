import { jsonError, jsonOk, nowIso } from "@/lib/studioCrud";
import { studioOutfitRepo } from "@/storage/studioRepos";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const existing = await studioOutfitRepo.get(id);
  if (!existing) return jsonError("Roupa não encontrada.", 404);
  const body = (await request.json()) as Record<string, unknown>;

  let imageUrl = existing.imageUrl;
  let wornImageUrl = existing.wornImageUrl;

  if (body.swapPhotoSlots === true) {
    imageUrl = existing.wornImageUrl;
    wornImageUrl = existing.imageUrl;
  } else if (body.movePhoto === "pieceToWorn") {
    // Foto que está em Peça vai para Ela vestida (troca se já tiver).
    if (existing.imageUrl) {
      imageUrl = existing.wornImageUrl;
      wornImageUrl = existing.imageUrl;
    }
  } else if (body.movePhoto === "wornToPiece") {
    if (existing.wornImageUrl) {
      wornImageUrl = existing.imageUrl;
      imageUrl = existing.wornImageUrl;
    }
  } else if (body.clearPhoto === "piece") {
    imageUrl = undefined;
  } else if (body.clearPhoto === "worn") {
    wornImageUrl = undefined;
  } else if (body.clearPhoto === "both") {
    imageUrl = undefined;
    wornImageUrl = undefined;
  } else {
    if ("imageUrl" in body) {
      imageUrl =
        typeof body.imageUrl === "string" && body.imageUrl.trim()
          ? body.imageUrl.trim()
          : undefined;
    }
    if ("wornImageUrl" in body) {
      wornImageUrl =
        typeof body.wornImageUrl === "string" && body.wornImageUrl.trim()
          ? body.wornImageUrl.trim()
          : undefined;
    }
  }

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
    imageUrl,
    wornImageUrl,
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
