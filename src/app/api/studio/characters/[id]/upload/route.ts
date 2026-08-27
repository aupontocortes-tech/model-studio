import { jsonError, jsonOk, createId, nowIso } from "@/lib/studioCrud";
import { safeFilename, validateAudioUpload, validateUpload } from "@/lib/upload";
import { saveUploadBuffer } from "@/storage/fs";
import {
  emptyStudioCharacter,
  emptyVoice,
  normalizeStudioCharacter,
} from "@/domain/studioAssets";
import { isNeonEnabled } from "@/db/neon";
import { studioCharacterRepo } from "@/storage/studioRepos";

export const maxDuration = 60;
export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

const NEON_REQUIRED_MSG =
  "Personagem não encontrada neste servidor. Na Vercel o DATABASE_URL ainda é inválido (placeholder) — os dados somem entre máquinas. Em Vercel → Settings → Environment Variables, cole a connection string real do Neon (Connect → Connection string com -pooler) e faça Redeploy.";

/** Upload face | body | voice para o banco da personagem */
export async function POST(request: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const form = await request.formData();
    let existing = await studioCharacterRepo.get(id);

    if (!existing) {
      // Sem Neon na Vercel, cada máquina tem /tmp próprio — a personagem some.
      if (process.env.VERCEL && !isNeonEnabled()) {
        return jsonError(NEON_REQUIRED_MSG, 404);
      }
      // Recria stub se o id veio do cliente (lista antiga / race local).
      const displayName =
        String(form.get("displayName") || "").trim() || "Nova personagem";
      existing = emptyStudioCharacter(id, nowIso(), displayName);
      const identityPrompt = String(form.get("identityPrompt") || "").trim();
      if (identityPrompt) {
        existing = {
          ...existing,
          identity: { ...existing.identity, identityPrompt },
        };
      }
      await studioCharacterRepo.upsert(existing);
    }

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
      mimeHint: file.type,
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
  } catch (e) {
    return jsonError(
      e instanceof Error ? e.message : "Falha no upload da foto.",
      500,
    );
  }
}
