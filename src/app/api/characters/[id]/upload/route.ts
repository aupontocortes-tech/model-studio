import { jsonError, jsonOk } from "@/lib/api";
import { createId, nowIso } from "@/lib/ids";
import { safeFilename, validateUpload } from "@/lib/upload";
import type { ReferenceImage } from "@/domain/types";
import { saveUploadBuffer } from "@/storage/fs";
import { characterRepo, referenceRepo } from "@/storage/repositories";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const character = await characterRepo.get(id);
  if (!character) return jsonError("Personagem não encontrada.", 404);

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return jsonError("Arquivo obrigatório.");

  const validation = validateUpload({
    name: file.name,
    type: file.type,
    size: file.size,
  });
  if (!validation.ok) return jsonError(validation.error);

  const ext = file.name.includes(".")
    ? `.${file.name.split(".").pop()!.toLowerCase()}`
    : ".jpg";
  const filename = `${createId("ref")}_${safeFilename(file.name).replace(/\.[^.]+$/, "")}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const saved = await saveUploadBuffer({
    relativeDir: `characters/${id}`,
    filename,
    buffer,
  });

  const ref: ReferenceImage = {
    id: createId("refmeta"),
    characterId: id,
    role: "CHARACTER_REFERENCE",
    label: "avatar",
    filename,
    mimeType: file.type || "image/jpeg",
    sizeBytes: file.size,
    url: saved.publicUrl,
    sortOrder: character.referenceIds.length,
    createdAt: nowIso(),
  };

  await referenceRepo.upsert(ref);

  character.primaryImageUrl = saved.publicUrl;
  character.referenceIds = Array.from(
    new Set([...character.referenceIds, ref.id]),
  );
  character.lockIdentity = true;
  character.updatedAt = nowIso();
  await characterRepo.upsert(character);

  return jsonOk({ reference: ref, character }, { status: 201 });
}
