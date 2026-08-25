import { jsonError, jsonOk } from "@/lib/api";
import { createId, nowIso } from "@/lib/ids";
import type {
  CtaMode,
  Generation,
  GenerationConfig,
  SceneConfig,
  ScenePresetId,
  CharacterCastEntry,
} from "@/domain/types";
import { getImageProvider } from "@/services/ai/factory";
import { promptEngine } from "@/services/prompt/PromptEngine";
import { generationValidator } from "@/services/validation/GenerationValidator";
import {
  characterRepo,
  generationRepo,
  productRepo,
  projectRepo,
} from "@/storage/repositories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET() {
  const generations = (await generationRepo.all()).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
  return jsonOk({ generations });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    productId?: string;
    characterId?: string;
    projectId?: string;
    scenePresetId?: ScenePresetId;
    lockCharacter?: boolean;
    variationCount?: 1 | 2 | 4;
    withSpeech?: boolean;
    cta?: CtaMode;
    customCta?: string;
    tiktokShop?: boolean;
    parentGenerationId?: string;
    sceneFromAvatar?: boolean;
    kalodataHint?: string;
    videoAction?: string;
    videoTakes?: number;
    referenceVideoUrl?: string;
    replicateMotionFromVideo?: boolean;
    characterCast?: CharacterCastEntry[];
    customSpeechScript?: string;
  };

  if (!body.productId || !body.characterId) {
    return jsonError("productId e characterId são obrigatórios.");
  }

  const product = await productRepo.get(body.productId);
  const character = await characterRepo.get(body.characterId);
  if (!product) return jsonError("Produto não encontrado.", 404);
  if (!character) return jsonError("Personagem não encontrada.", 404);

  const variationCount = ([1, 2, 4].includes(Number(body.variationCount))
    ? Number(body.variationCount)
    : 1) as 1 | 2 | 4;

  const lockCharacter =
    body.lockCharacter !== undefined
      ? Boolean(body.lockCharacter)
      : character.lockIdentity;

  const provider = getImageProvider();
  const created: Generation[] = [];

  for (let i = 0; i < variationCount; i++) {
    const scene: SceneConfig = {
      presetId: body.scenePresetId || "mirror_selfie",
      aspectRatio: "9:16",
      variationSeed: Date.now() + i * 17,
      sceneFromAvatar: Boolean(body.sceneFromAvatar),
      kalodataHint: body.kalodataHint?.trim() || undefined,
    };

    const config: GenerationConfig = {
      scene,
      lockCharacter,
      variationIndex: i,
      variationCount,
      withSpeech: Boolean(body.withSpeech),
      cta: body.cta || "carrinho_laranja",
      customCta: body.customCta,
      tiktokShop: body.tiktokShop !== false,
      videoAction: body.videoAction?.trim() || undefined,
      videoTakes: body.videoTakes,
      customSpeechScript: body.customSpeechScript?.trim() || undefined,
      referenceVideoUrl: body.referenceVideoUrl?.trim() || undefined,
      replicateMotionFromVideo: Boolean(body.replicateMotionFromVideo),
      characterCast: body.characterCast,
    };

    const now = nowIso();
    let generation: Generation = {
      id: createId("gen"),
      projectId: body.projectId,
      productId: product.id,
      characterId: character.id,
      status: "generating",
      provider: provider.name,
      config,
      imagePrompt: "",
      negativePrompt: "",
      referenceVideoUrl: body.referenceVideoUrl?.trim() || undefined,
      parentGenerationId: body.parentGenerationId,
      createdAt: now,
      updatedAt: now,
    };

    const imagePrompt = promptEngine.buildImagePrompt({
      product,
      character: character.profile,
      lockCharacter,
      scene,
      hasAvatarReference: Boolean(character.primaryImageUrl),
    });
    const negativePrompt = promptEngine.buildNegativePrompt(product.spec);

    generation.imagePrompt = imagePrompt;
    generation.negativePrompt = negativePrompt;

    await generationRepo.upsert(generation);

    try {
      const productUrls = product.references
        .filter((r) => r.role === "PRODUCT_REFERENCE")
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((r) => r.url);
      const avatarUrls = character.primaryImageUrl
        ? [character.primaryImageUrl]
        : [];

      const result = await provider.generateFromReferences({
        prompt: imagePrompt,
        negativePrompt,
        referenceImageUrls: [...productUrls, ...avatarUrls],
        aspectRatio: "9:16",
        width: 720,
        height: 1280,
      });

      const validation = await generationValidator.validate({
        referenceImageUrls: product.references.map((r) => r.url),
        resultImageUrl: result.imageUrl,
        productLocked: true,
        characterLocked: lockCharacter,
      });

      generation = {
        ...generation,
        status: result.status === "completed" ? "completed" : "failed",
        resultImageUrl: result.imageUrl,
        validationNotes: JSON.stringify(validation),
        updatedAt: nowIso(),
      };

      if (config.withSpeech) {
        generation.speechScript = promptEngine.buildSpeech({
          product,
          cta: config.cta,
          customCta: config.customCta,
          seed: scene.variationSeed,
          customSpeechScript: config.customSpeechScript,
          voiceProfile: character.voiceProfile,
          characterCast: config.characterCast,
        });
      }
    } catch {
      generation = {
        ...generation,
        status: "failed",
        updatedAt: nowIso(),
      };
    }

    await generationRepo.upsert(generation);
    created.push(generation);

    character.generationIds = Array.from(
      new Set([...character.generationIds, generation.id]),
    );
    character.updatedAt = nowIso();
    await characterRepo.upsert(character);

    if (body.projectId) {
      const project = await projectRepo.get(body.projectId);
      if (project) {
        project.generationIds = Array.from(
          new Set([...project.generationIds, generation.id]),
        );
        project.updatedAt = nowIso();
        await projectRepo.upsert(project);
      }
    }
  }

  return jsonOk({ generations: created }, { status: 201 });
}
