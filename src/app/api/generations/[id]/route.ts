import { jsonError, jsonOk } from "@/lib/api";
import { createId, nowIso } from "@/lib/ids";
import type { Generation, VideoStyleId, CharacterCastEntry } from "@/domain/types";
import { getVideoProvider } from "@/services/ai/factory";
import { promptEngine } from "@/services/prompt/PromptEngine";
import {
  characterRepo,
  generationRepo,
  productRepo,
} from "@/storage/repositories";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const generation = await generationRepo.get(id);
  if (!generation) return jsonError("Geração não encontrada.", 404);
  return jsonOk({ generation });
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const existing = await generationRepo.get(id);
  if (!existing) return jsonError("Geração não encontrada.", 404);

  const body = (await request.json()) as {
    status?: Generation["status"];
    action?: "approve" | "reject" | "video_prompt" | "speech" | "duplicate";
    videoStyle?: VideoStyleId;
    withSpeech?: boolean;
    videoAction?: string;
    videoTakes?: number;
    referenceVideoUrl?: string;
    replicateMotionFromVideo?: boolean;
    characterCast?: CharacterCastEntry[];
    customSpeechScript?: string;
  };

  if (body.action === "duplicate") {
    const now = nowIso();
    const copy: Generation = {
      ...existing,
      id: createId("gen"),
      status: "draft",
      parentGenerationId: existing.id,
      createdAt: now,
      updatedAt: now,
      resultImageUrl: undefined,
      resultVideoUrl: undefined,
    };
    await generationRepo.upsert(copy);
    return jsonOk({ generation: copy }, { status: 201 });
  }

  const updated: Generation = { ...existing, updatedAt: nowIso() };

  if (body.status) updated.status = body.status;
  if (body.action === "approve") updated.status = "approved";
  if (body.action === "reject") updated.status = "rejected";

  if (body.action === "video_prompt" || body.action === "speech") {
    const product = await productRepo.get(existing.productId);
    const character = await characterRepo.get(existing.characterId);
    if (!product || !character) {
      return jsonError("Produto ou personagem não encontrados.", 404);
    }

    const style = body.videoStyle || updated.config.videoStyle || "mirror_selfie";
    const videoAction =
      body.videoAction?.trim() ||
      updated.config.videoAction ||
      undefined;
    const videoTakes = body.videoTakes || updated.config.videoTakes || 1;
    const referenceVideoUrl =
      body.referenceVideoUrl?.trim() ||
      updated.referenceVideoUrl ||
      updated.config.referenceVideoUrl;
    const replicateMotion =
      body.replicateMotionFromVideo ??
      updated.config.replicateMotionFromVideo ??
      Boolean(referenceVideoUrl);
    const characterCast =
      body.characterCast || updated.config.characterCast;
    const customSpeechScript =
      body.customSpeechScript?.trim() ||
      updated.config.customSpeechScript;

    const { takes, combinedPrompt } = promptEngine.buildVideoTakes({
      style,
      lockCharacter: existing.config.lockCharacter,
      productName: product.name,
      videoAction,
      videoTakes,
      referenceVideoUrl,
      replicateMotionFromVideo: replicateMotion,
      characterCast,
      customSpeechScript,
    });

    updated.videoPrompt = combinedPrompt;
    updated.videoTakes = takes;
    updated.referenceVideoUrl = referenceVideoUrl;
    updated.config = {
      ...updated.config,
      videoStyle: style,
      videoAction,
      videoTakes,
      videoTakePlans: takes,
      referenceVideoUrl,
      replicateMotionFromVideo: replicateMotion,
      characterCast,
      customSpeechScript,
      withSpeech:
        body.withSpeech !== undefined
          ? body.withSpeech
          : updated.config.withSpeech,
    };

    if (updated.config.withSpeech || body.action === "speech") {
      updated.speechScript = promptEngine.buildSpeech({
        product,
        cta: updated.config.cta,
        customCta: updated.config.customCta,
        seed: Date.now(),
        customSpeechScript,
        voiceProfile: character.voiceProfile,
        characterCast,
      });
    }

    const videoProvider = getVideoProvider();
    await videoProvider.generateFromImage({
      prompt: updated.videoPrompt,
      sourceImageUrl: updated.resultImageUrl,
      durationSeconds: 8 * videoTakes,
      aspectRatio: "9:16",
    });
  }

  await generationRepo.upsert(updated);
  return jsonOk({ generation: updated });
}
