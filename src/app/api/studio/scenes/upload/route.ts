import { jsonError, jsonOk, createId, nowIso } from "@/lib/studioCrud";
import { safeFilename, validateUpload } from "@/lib/upload";
import { saveUploadBuffer } from "@/storage/fs";
import {
  normalizeStudioCharacter,
  uniqueIds,
  type ScenePhotoSlot,
  type StudioScene,
} from "@/domain/studioAssets";
import {
  studioCharacterRepo,
  studioSceneRepo,
} from "@/storage/studioRepos";

export const maxDuration = 60;
export const runtime = "nodejs";

/** Cria ou atualiza um cenário. slot=place (lugar) ou inScene (ela no cenário). */
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

  const existingId = String(form.get("sceneId") || "").trim();
  const characterId = String(form.get("characterId") || "").trim();
  const name = String(form.get("name") || "").trim();
  const description = String(form.get("description") || "").trim();
  const slotRaw = String(form.get("slot") || "place");
  const slot: ScenePhotoSlot = slotRaw === "inScene" ? "inScene" : "place";

  const ext = file.name.includes(".")
    ? `.${file.name.split(".").pop()!.toLowerCase()}`
    : ".jpg";
  const id = existingId || createId("scene");
  const filename = `${slot}_${createId("img")}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const saved = await saveUploadBuffer({
    relativeDir: `studio-scenes/${id}`,
    filename: safeFilename(filename),
    buffer,
    mimeHint: file.type,
  });

  const now = nowIso();
  const existing = existingId ? await studioSceneRepo.get(existingId) : undefined;
  if (existingId && !existing) return jsonError("Cenário não encontrado.", 404);

  const photoPatch =
    slot === "inScene"
      ? { inSceneImageUrl: saved.publicUrl }
      : { imageUrl: saved.publicUrl };

  const scene: StudioScene = existing
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
        imageUrl: slot === "place" ? saved.publicUrl : undefined,
        inSceneImageUrl: slot === "inScene" ? saved.publicUrl : undefined,
        createdAt: now,
        updatedAt: now,
      };

  await studioSceneRepo.upsert(scene);

  if (characterId) {
    const character = await studioCharacterRepo.get(characterId);
    if (character) {
      const base = normalizeStudioCharacter(character);
      await studioCharacterRepo.upsert({
        ...base,
        sceneIds: uniqueIds([...base.sceneIds, scene.id]),
        updatedAt: now,
      });
    }
  }

  return jsonOk({ scene, url: saved.publicUrl }, { status: existing ? 200 : 201 });
  } catch (e) {
    return jsonError(
      e instanceof Error ? e.message : "Falha no upload do cenário.",
      500,
    );
  }
}
