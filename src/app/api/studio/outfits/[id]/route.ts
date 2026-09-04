import { jsonError, jsonOk, nowIso } from "@/lib/studioCrud";
import { normalizeStudioOutfit } from "@/domain/studioAssets";
import { studioOutfitRepo } from "@/storage/studioRepos";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const raw = await studioOutfitRepo.get(id);
  if (!raw) return jsonError("Roupa não encontrada.", 404);
  const existing = normalizeStudioOutfit(raw);
  const body = (await request.json()) as Record<string, unknown>;

  let imageUrl = existing.imageUrl;
  let wornImageUrl = existing.wornImageUrl;
  let wornGallery = [...(existing.wornGallery || [])];

  if (body.swapPhotoSlots === true) {
    imageUrl = existing.wornImageUrl;
    wornImageUrl = existing.imageUrl;
  } else if (body.movePhoto === "pieceToWorn") {
    if (existing.imageUrl) {
      imageUrl = existing.wornImageUrl;
      wornImageUrl = existing.imageUrl;
    }
  } else if (body.movePhoto === "wornToPiece") {
    if (existing.wornImageUrl) {
      imageUrl = existing.wornImageUrl;
      if (existing.imageUrl) {
        wornImageUrl = existing.imageUrl;
      } else if (wornGallery.length > 0) {
        wornImageUrl = wornGallery[0];
        wornGallery = wornGallery.slice(1);
      } else {
        wornImageUrl = undefined;
      }
    }
  } else if (body.clearPhoto === "piece") {
    imageUrl = undefined;
  } else if (body.clearPhoto === "worn") {
    if (wornGallery.length > 0) {
      wornImageUrl = wornGallery[0];
      wornGallery = wornGallery.slice(1);
    } else {
      wornImageUrl = undefined;
    }
  } else if (body.clearPhoto === "both") {
    imageUrl = undefined;
    wornImageUrl = undefined;
    wornGallery = [];
  } else if (typeof body.removeWornUrl === "string") {
    const url = body.removeWornUrl.trim();
    if (wornImageUrl === url) {
      wornImageUrl = wornGallery[0];
      wornGallery = wornGallery.slice(1);
    } else {
      wornGallery = wornGallery.filter((u) => u !== url);
    }
  } else if (typeof body.setPrimaryWorn === "string") {
    const url = body.setPrimaryWorn.trim();
    if (url && url !== wornImageUrl) {
      const oldPrimary = wornImageUrl;
      wornImageUrl = url;
      wornGallery = [
        ...(oldPrimary && oldPrimary !== url ? [oldPrimary] : []),
        ...wornGallery.filter((u) => u !== url),
      ];
    }
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
    if (Array.isArray(body.wornGallery)) {
      wornGallery = body.wornGallery.filter(
        (u): u is string => typeof u === "string" && Boolean(u.trim()),
      );
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
    wornGallery: wornGallery.length ? wornGallery : undefined,
    updatedAt: nowIso(),
  });
  return jsonOk({ outfit: normalizeStudioOutfit(updated) });
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!(await studioOutfitRepo.get(id))) {
    return jsonError("Roupa não encontrada.", 404);
  }
  await studioOutfitRepo.remove(id);
  return jsonOk({ ok: true });
}
