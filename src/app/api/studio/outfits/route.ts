import type { StudioOutfit } from "@/domain/studioAssets";
import { jsonError, jsonOk, createId, nowIso } from "@/lib/studioCrud";
import { studioOutfitRepo } from "@/storage/studioRepos";

export async function GET() {
  return jsonOk({ outfits: await studioOutfitRepo.all() });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    name?: string;
    description?: string;
    colors?: string;
    imageUrl?: string;
    wornImageUrl?: string;
    projectId?: string;
  };
  const now = nowIso();
  const outfit: StudioOutfit = {
    id: createId("outfit"),
    projectId: body.projectId,
    name: body.name?.trim() || "",
    description: body.description?.trim() || "",
    colors: body.colors?.trim() || undefined,
    imageUrl: body.imageUrl,
    wornImageUrl: body.wornImageUrl,
    createdAt: now,
    updatedAt: now,
  };
  if (!outfit.name && !outfit.description && !outfit.imageUrl && !outfit.wornImageUrl) {
    return jsonError("Envie a foto da peça ou dela vestida, um nome ou um prompt.");
  }
  await studioOutfitRepo.upsert(outfit);
  return jsonOk({ outfit }, { status: 201 });
}
