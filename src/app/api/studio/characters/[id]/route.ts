import {
  emptyVoice,
  normalizeStudioCharacter,
  uniqueIds,
  type CharacterLibraryItem,
  type CharacterVoice,
} from "@/domain/studioAssets";
import { jsonError, jsonOk, createId, nowIso } from "@/lib/studioCrud";
import { studioCharacterRepo } from "@/storage/studioRepos";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const existing = await studioCharacterRepo.get(id);
  if (!existing) return jsonError("Personagem não encontrada.", 404);
  return jsonOk({ character: normalizeStudioCharacter(existing) });
}

export async function PATCH(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const existing = await studioCharacterRepo.get(id);
  if (!existing) return jsonError("Personagem não encontrada.", 404);
  const body = (await request.json()) as Record<string, unknown>;
  const base = normalizeStudioCharacter(existing);

  const identity = {
    ...base.identity,
    ...(typeof body.displayName === "string"
      ? { displayName: body.displayName.trim() || base.identity.displayName }
      : {}),
    ...(typeof body.identityPrompt === "string"
      ? { identityPrompt: body.identityPrompt.trim() }
      : {}),
  };

  let movements = base.movements;
  let scenes = base.scenes;
  let outfitIds = [...base.outfitIds];
  let sceneIds = [...base.sceneIds];

  if (body.addMovement && typeof body.addMovement === "object") {
    const m = body.addMovement as { name?: string; prompt?: string };
    const item: CharacterLibraryItem = {
      id: createId("cmove"),
      name: (m.name || "Movimento").trim(),
      prompt: (m.prompt || "").trim(),
    };
    movements = [...movements, item];
  }
  if (typeof body.removeMovementId === "string") {
    movements = movements.filter((x) => x.id !== body.removeMovementId);
  }

  if (body.addScene && typeof body.addScene === "object") {
    const s = body.addScene as { name?: string; prompt?: string };
    const item: CharacterLibraryItem = {
      id: createId("cscene"),
      name: (s.name || "Cenário").trim(),
      prompt: (s.prompt || "").trim(),
    };
    scenes = [...scenes, item];
  }
  if (typeof body.removeSceneId === "string") {
    scenes = scenes.filter((x) => x.id !== body.removeSceneId);
  }

  if (typeof body.addOutfitId === "string" && body.addOutfitId.trim()) {
    outfitIds = uniqueIds([...outfitIds, body.addOutfitId.trim()]);
  }
  if (typeof body.removeOutfitId === "string") {
    outfitIds = outfitIds.filter((x) => x !== body.removeOutfitId);
  }
  if (Array.isArray(body.outfitIds)) {
    outfitIds = uniqueIds(
      body.outfitIds.filter(
        (x): x is string => typeof x === "string" && x.trim().length > 0,
      ),
    );
  }
  if (typeof body.addSceneId === "string" && body.addSceneId.trim()) {
    sceneIds = uniqueIds([...sceneIds, body.addSceneId.trim()]);
  }
  if (typeof body.removePinnedSceneId === "string") {
    sceneIds = sceneIds.filter((x) => x !== body.removePinnedSceneId);
  }
  if (Array.isArray(body.sceneIds)) {
    sceneIds = uniqueIds(
      body.sceneIds.filter(
        (x): x is string => typeof x === "string" && x.trim().length > 0,
      ),
    );
  }

  let voice = base.voice || emptyVoice();
  if (body.voice && typeof body.voice === "object") {
    const v = body.voice as CharacterVoice;
    voice = {
      name: typeof v.name === "string" ? v.name.trim() : voice.name,
      prompt: typeof v.prompt === "string" ? v.prompt.trim() : voice.prompt,
      notes: typeof v.notes === "string" ? v.notes.trim() : voice.notes,
      audioUrl: typeof v.audioUrl === "string" ? v.audioUrl : voice.audioUrl,
    };
  }
  if (body.clearVoice === true) {
    voice = emptyVoice();
  }

  const updated = await studioCharacterRepo.upsert({
    ...base,
    identity,
    bodyDetails:
      typeof body.bodyDetails === "string"
        ? body.bodyDetails.trim()
        : base.bodyDetails,
    bodyPrompt:
      typeof body.bodyPrompt === "string"
        ? body.bodyPrompt.trim()
        : base.bodyPrompt,
    faceImageUrl:
      typeof body.faceImageUrl === "string"
        ? body.faceImageUrl
        : base.faceImageUrl,
    bodyImageUrl:
      typeof body.bodyImageUrl === "string"
        ? body.bodyImageUrl
        : base.bodyImageUrl,
    outfitIds,
    sceneIds,
    movements,
    scenes,
    voice,
    updatedAt: nowIso(),
  });
  return jsonOk({ character: updated });
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!(await studioCharacterRepo.get(id))) {
    return jsonError("Personagem não encontrada.", 404);
  }
  await studioCharacterRepo.remove(id);
  return jsonOk({ ok: true });
}
