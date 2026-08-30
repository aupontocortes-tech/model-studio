import { jsonError, jsonOk, createId, nowIso } from "@/lib/studioCrud";
import { safeFilename, validateUpload } from "@/lib/upload";
import { saveUploadBuffer } from "@/storage/fs";
import {
  normalizeStudioCharacter,
  uniqueIds,
  type OutfitPhotoSlot,
  type StudioOutfit,
} from "@/domain/studioAssets";
import {
  studioCharacterRepo,
  studioOutfitRepo,
} from "@/storage/studioRepos";

export const maxDuration = 60;
export const runtime = "nodejs";

/** Cria ou atualiza uma roupa. slot=piece (peça) ou worn (ela vestida). */
export async function POST(request: Request) {
  try {
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return jsonError("Foto é obrigatória.");

  const validation = validateUpload({
    name: file.name,
    type: file.type,
    size: file.size,
  });
  if (!validation.ok) return jsonError(validation.error);

  const existingId = String(form.get("outfitId") || "").trim();
  const characterId = String(form.get("characterId") || "").trim();
  const name = String(form.get("name") || "").trim();
  const description = String(form.get("description") || "").trim();
  const slotRaw = String(form.get("slot") || "piece");
  const slot: OutfitPhotoSlot = slotRaw === "worn" ? "worn" : "piece";
  const appendWorn = String(form.get("appendWorn") || "") === "true";

  const ext = file.name.includes(".")
    ? `.${file.name.split(".").pop()!.toLowerCase()}`
    : ".jpg";
  const id = existingId || createId("outfit");
  const filename = `${slot}_${createId("img")}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const saved = await saveUploadBuffer({
    relativeDir: `studio-outfits/${id}`,
    filename: safeFilename(filename),
    buffer,
    mimeHint: file.type,
  });

  const now = nowIso();
  const existing = existingId ? await studioOutfitRepo.get(existingId) : undefined;
  if (existingId && !existing) return jsonError("Roupa não encontrada.", 404);

  const photoPatch =
    slot === "worn"
      ? existing && appendWorn && existing.wornImageUrl
        ? {
            wornGallery: [
              ...(existing.wornGallery || []),
              saved.publicUrl,
            ],
          }
        : { wornImageUrl: saved.publicUrl }
      : { imageUrl: saved.publicUrl };

  const outfit: StudioOutfit = existing
    ? {
        ...existing,
        name: name || existing.name,
        description: description || existing.description,
        ...photoPatch,
        updatedAt: now,
      }
    : {
        id,
        name,
        description,
        imageUrl: slot === "piece" ? saved.publicUrl : undefined,
        wornImageUrl: slot === "worn" ? saved.publicUrl : undefined,
        wornGallery: undefined,
        createdAt: now,
        updatedAt: now,
      };

  await studioOutfitRepo.upsert(outfit);

  if (characterId) {
    const character = await studioCharacterRepo.get(characterId);
    if (character) {
      const base = normalizeStudioCharacter(character);
      await studioCharacterRepo.upsert({
        ...base,
        outfitIds: uniqueIds([...base.outfitIds, outfit.id]),
        updatedAt: now,
      });
    }
  }

  return jsonOk({ outfit, url: saved.publicUrl }, { status: existing ? 200 : 201 });
  } catch (e) {
    return jsonError(
      e instanceof Error ? e.message : "Falha no upload da roupa.",
      500,
    );
  }
}
