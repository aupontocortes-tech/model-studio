import { jsonError, jsonOk } from "@/lib/api";
import { getEnv } from "@/lib/env";
import { normalizeStudioCharacter, outfitLabel } from "@/domain/studioAssets";
import {
  buildCreativeDirectorPrompt,
  buildOutfitTryOnPrompt,
} from "@/services/prompt/CreativeDirector";
import {
  materializeReferenceUrls,
  startBrowserAgentJob,
} from "@/services/browser-agent/runner";
import {
  studioCharacterRepo,
  studioOutfitRepo,
  studioSceneRepo,
} from "@/storage/studioRepos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Comando único: personagem + look + foto|vídeo → abre a ferramenta (Flow)
 * via agente local. Na Vercel retorna 503 (use pacote Claude).
 */
export async function POST(request: Request) {
  if (process.env.VERCEL) {
    return jsonError(
      "Executar no navegador só no PC local (DiCloak). Na nuvem use o botão Claude — ele gera o pacote para o Computer Use.",
      503,
    );
  }

  const body = (await request.json()) as {
    characterId?: string;
    outfitId?: string;
    sceneId?: string;
    keepSceneFromPhoto?: boolean;
    characterMovementId?: string;
    prompt?: string;
    kind?: "image" | "video";
    tool?: "flow" | "claude";
  };

  const characterId = body.characterId?.trim();
  const outfitId = body.outfitId?.trim();
  const kind = body.kind === "video" ? "video" : "image";
  if (!characterId) return jsonError("Escolha a personagem.");
  if (!outfitId) return jsonError("Escolha o look.");

  const raw = await studioCharacterRepo.get(characterId);
  if (!raw) return jsonError("Personagem não encontrada.", 404);
  const character = normalizeStudioCharacter(raw);
  const outfit = await studioOutfitRepo.get(outfitId);
  if (!outfit) return jsonError("Look não encontrado.", 404);

  const scene =
    body.keepSceneFromPhoto || !body.sceneId
      ? null
      : (await studioSceneRepo.get(body.sceneId)) || null;
  const movement = body.characterMovementId
    ? character.movements.find((m) => m.id === body.characterMovementId)
    : undefined;

  const prompt =
    body.prompt?.trim() ||
    (kind === "image"
      ? buildOutfitTryOnPrompt({
          character,
          outfit,
          movementPrompt: movement?.prompt,
          keepSceneFromPhoto: Boolean(body.keepSceneFromPhoto),
          scene,
        })
      : buildCreativeDirectorPrompt({
          character,
          outfit,
          scene,
          libraryMovementPrompt: movement?.prompt,
          kind: "video",
          keepSceneFromPhoto: Boolean(body.keepSceneFromPhoto),
          includeVoice: true,
        }).fullPrompt);

  const referenceUrls = [
    character.faceImageUrl,
    character.bodyImageUrl,
    outfit.imageUrl,
    outfit.wornImageUrl,
  ].filter((u): u is string => Boolean(u));

  const referencePaths = await materializeReferenceUrls(referenceUrls);
  const sourcePaths = await materializeReferenceUrls(
    [outfit.wornImageUrl || character.bodyImageUrl || character.faceImageUrl].filter(
      (u): u is string => Boolean(u),
    ),
  );
  const env = getEnv();

  const job = await startBrowserAgentJob({
    kind: kind === "video" ? "google_flow_video" : "google_flow_image",
    prompt,
    productName: `${character.identity.displayName} · ${outfitLabel(outfit)} · ${kind}`,
    referencePaths: kind === "image" ? referencePaths : [],
    sourceImagePath: kind === "video" ? sourcePaths[0] : undefined,
    headless: false,
  });

  return jsonOk(
    {
      job,
      prompt,
      kind,
      tool: "flow",
      referenceCount: kind === "image" ? referencePaths.length : sourcePaths.length,
      flowUrl: env.googleFlowUrl,
      tip:
        kind === "image"
          ? "Flow aberto para FOTO. Revise, gere e salve — depois Salvar no look."
          : "Flow aberto para VÍDEO (usa a foto dela vestida se existir). Gere no Flow e baixe o resultado.",
    },
    { status: 201 },
  );
}
