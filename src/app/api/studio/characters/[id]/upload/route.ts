import { jsonError, jsonOk, createId, nowIso } from "@/lib/studioCrud";
import { safeFilename, validateAudioUpload, validateUpload } from "@/lib/upload";
import { saveUploadBuffer } from "@/storage/fs";
import {
  emptyVoice,
  normalizeStudioCharacter,
} from "@/domain/studioAssets";
import { studioCharacterRepo } from "@/storage/studioRepos";

type Ctx = { params: Promise<{ id: string }> };

/** Upload face | body | voice para o banco da personagem */
export async function POST(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const existing = await studioCharacterRepo.get(id);
  if (!existing) return jsonError("Personagem não encontrada.", 404);

  const form = await request.formData();
  const file = form.get("file");
  const kind = String(form.get("kind") || "face");
  if (!(file instanceof File)) return jsonError("Arquivo obrigatório.");
  if (kind !== "face" && kind !== "body" && kind !== "voice") {
    return jsonError("kind deve ser face, body ou voice.");
  }

  if (kind === "voice") {
    const validation = validateAudioUpload({
      name: file.name,
      type: file.type,
      size: file.size,
    });
    if (!validation.ok) return jsonError(validation.error);
  } else {
    const validation = validateUpload({
      name: file.name,
      type: file.type,
      size: file.size,
    });
    if (!validation.ok) return jsonError(validation.error);
  }

  const ext = file.name.includes(".")
    ? `.${file.name.split(".").pop()!.toLowerCase()}`
    : kind === "voice"
      ? ".mp3"
      : ".jpg";
  const filename = `${kind}_${createId(kind === "voice" ? "aud" : "img")}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const saved = await saveUploadBuffer({
    relativeDir: `studio-characters/${id}`,
    filename: safeFilename(filename),
    buffer,
  });

  const base = normalizeStudioCharacter(existing);
  const voice = base.voice || emptyVoice();
  const updated = await studioCharacterRepo.upsert({
    ...base,
    faceImageUrl: kind === "face" ? saved.publicUrl : base.faceImageUrl,
    bodyImageUrl: kind === "body" ? saved.publicUrl : base.bodyImageUrl,
    primaryImageUrl:
      kind === "face"
        ? saved.publicUrl
        : base.primaryImageUrl || base.faceImageUrl,
    voice:
      kind === "voice"
        ? { ...voice, audioUrl: saved.publicUrl }
        : voice,
    updatedAt: nowIso(),
  });

  return jsonOk({ character: updated, url: saved.publicUrl }, { status: 201 });
}
