import {
  emptyStudioCharacter,
  normalizeStudioCharacter,
  type FramingOption,
  type AspectRatioOption,
  type SavedStudioPrompt,
  type StudioMediaKind,
} from "@/domain/studioAssets";
import { jsonError, jsonOk, createId, nowIso } from "@/lib/studioCrud";
import {
  buildCreativeDirectorPrompt,
  buildOutfitTryOnPrompt,
  titleForSavedPrompt,
} from "@/services/prompt/CreativeDirector";
import {
  savedStudioPromptRepo,
  studioCharacterRepo,
  studioOutfitRepo,
  studioSceneRepo,
} from "@/storage/studioRepos";

export async function GET() {
  const prompts = (await savedStudioPromptRepo.all()).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
  return jsonOk({ prompts });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    characterId?: string;
    characterPrompt?: string;
    characterName?: string;
    outfitId?: string;
    outfitPrompt?: string;
    sceneId?: string;
    characterMovementId?: string;
    characterSceneId?: string;
    scenePrompt?: string;
    extraNotes?: string;
    projectId?: string;
    save?: boolean;
    kind?: StudioMediaKind;
    includeVoice?: boolean;
    keepSceneFromPhoto?: boolean;
    /** Prompt de vestir look (virtual try-on). */
    mode?: "default" | "tryOn";
    /** Se o usuário editou o texto, grava esse bloco. */
    editedPrompt?: string;
    /** Enquadramento da foto: rosto, corpo médio (coxa pra cima) ou corpo inteiro. */
    framing?: FramingOption;
    /** Tamanho / aspect ratio (9:16 padrão). */
    aspectRatio?: AspectRatioOption;
  };

  const now = nowIso();
  const kind: StudioMediaKind = body.kind === "image" ? "image" : "video";
  const tryOn = body.mode === "tryOn" || (kind === "image" && Boolean(body.outfitId));
  let character = body.characterId
    ? await studioCharacterRepo.get(body.characterId)
    : undefined;

  if (!character && body.characterPrompt?.trim()) {
    const prompt = body.characterPrompt.trim();
    character = {
      ...emptyStudioCharacter(
        createId("stchar"),
        now,
        body.characterName?.trim() ||
          prompt.split("\n")[0]?.slice(0, 48) ||
          "Personagem",
      ),
      projectId: body.projectId,
      identity: {
        ...emptyStudioCharacter("x", now).identity,
        displayName:
          body.characterName?.trim() ||
          prompt.split("\n")[0]?.slice(0, 48) ||
          "Personagem",
        identityPrompt: prompt,
      },
    };
    await studioCharacterRepo.upsert(character);
  }

  if (!character) {
    return jsonError("Escolha uma personagem do banco ou cole o prompt dela.");
  }

  character = normalizeStudioCharacter(character);
  const id = character.identity;
  const hasIdentity =
    id.identityPrompt?.trim() ||
    character.bodyPrompt?.trim() ||
    character.bodyDetails?.trim() ||
    character.faceImageUrl ||
    character.bodyImageUrl;

  if (!hasIdentity) {
    return jsonError(
      "Complete o banco da personagem (prompt/fotos) antes de gerar.",
    );
  }

  let outfit = body.outfitId
    ? (await studioOutfitRepo.get(body.outfitId)) || null
    : null;
  if (!outfit && body.outfitPrompt?.trim()) {
    const text = body.outfitPrompt.trim();
    outfit = {
      id: createId("outfit"),
      projectId: body.projectId || character.projectId,
      name: text.split("\n")[0]?.slice(0, 48) || "Roupa",
      description: text,
      createdAt: now,
      updatedAt: now,
    };
    await studioOutfitRepo.upsert(outfit);
    const withWardrobe = normalizeStudioCharacter({
      ...character,
      outfitIds: [...character.outfitIds, outfit.id],
    });
    character = await studioCharacterRepo.upsert({
      ...withWardrobe,
      updatedAt: now,
    });
  }

  if (tryOn && !outfit) {
    return jsonError(
      "Escolha um look da área de roupas para vestir nela.",
    );
  }

  const libraryScene = body.keepSceneFromPhoto
    ? undefined
    : body.sceneId
      ? await studioSceneRepo.get(body.sceneId)
      : undefined;
  const libMove = body.characterMovementId
    ? character.movements.find((m) => m.id === body.characterMovementId)
    : undefined;
  const pinnedLocalScene = body.keepSceneFromPhoto
    ? undefined
    : body.characterSceneId
      ? character.scenes.find((s) => s.id === body.characterSceneId)
      : undefined;

  const built = tryOn && outfit
    ? (() => {
        const fullPrompt =
          body.editedPrompt?.trim() ||
          buildOutfitTryOnPrompt({
            character,
            outfit,
            movementPrompt: libMove?.prompt,
            keepSceneFromPhoto: Boolean(body.keepSceneFromPhoto),
            scene: libraryScene || null,
            framing: body.framing,
            aspectRatio: body.aspectRatio,
          });
        return {
          systemPrompt: "Outfit try-on",
          userPrompt: fullPrompt,
          fullPrompt,
        };
      })()
    : buildCreativeDirectorPrompt({
        character,
        outfit,
        scene: libraryScene || null,
        libraryMovementPrompt: libMove?.prompt,
        libraryScenePrompt:
          pinnedLocalScene?.prompt ||
          body.scenePrompt?.trim() ||
          undefined,
        extraNotes: body.extraNotes,
        kind,
        includeVoice: body.includeVoice !== false,
        keepSceneFromPhoto: Boolean(body.keepSceneFromPhoto),
        aspectRatio: body.aspectRatio,
      });

  let saved: SavedStudioPrompt | undefined;
  if (body.save !== false) {
    saved = {
      id: createId("stprompt"),
      projectId: body.projectId || character.projectId,
      characterId: character.id,
      outfitId: outfit?.id,
      sceneId: libraryScene?.id || pinnedLocalScene?.id,
      movementId: libMove?.id,
      kind,
      title: titleForSavedPrompt(
        character,
        [
          outfit,
          libraryScene ||
            (pinnedLocalScene ? { name: pinnedLocalScene.name } : null) ||
            (body.keepSceneFromPhoto ? { name: "cenário da imagem" } : null),
          libMove ? { name: libMove.name } : null,
          tryOn ? { name: "trocar look" } : null,
        ],
        kind,
      ),
      systemPrompt: built.systemPrompt,
      userPrompt: built.userPrompt,
      fullPrompt: built.fullPrompt,
      createdAt: nowIso(),
    };
    await savedStudioPromptRepo.upsert(saved);
  }

  return jsonOk({
    ...built,
    saved,
    kind,
    mode: tryOn ? "tryOn" : "default",
    characterId: character.id,
    characterPreview: {
      id: character.id,
      displayName: character.identity.displayName,
      identityPrompt: character.identity.identityPrompt,
      faceImageUrl: character.faceImageUrl,
      bodyImageUrl: character.bodyImageUrl,
    },
  });
}
