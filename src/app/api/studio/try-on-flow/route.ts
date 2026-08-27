import { jsonError, jsonOk } from "@/lib/api";
import { getEnv } from "@/lib/env";
import { normalizeStudioCharacter, outfitLabel } from "@/domain/studioAssets";
import { buildOutfitTryOnPrompt } from "@/services/prompt/CreativeDirector";
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
 * Inicia o agente no Google Flow com prompt + fotos da personagem/look.
 * No PC local (DiCloak/Playwright). Na Vercel serverless não roda navegador.
 */
export async function POST(request: Request) {
  if (process.env.VERCEL) {
    return jsonError(
      "Gerar no Flow pelo agente só funciona no PC local (DiCloak/Playwright). Na Vercel use Copiar pacote Claude e rode o Computer Use aí.",
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
  };

  const characterId = body.characterId?.trim();
  const outfitId = body.outfitId?.trim();
  if (!characterId) return jsonError("Escolha a personagem.");
  if (!outfitId) return jsonError("Escolha o look da área de roupas.");

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
    buildOutfitTryOnPrompt({
      character,
      outfit,
      movementPrompt: movement?.prompt,
      keepSceneFromPhoto: Boolean(body.keepSceneFromPhoto),
      scene,
    });

  const referenceUrls = [
    character.faceImageUrl,
    character.bodyImageUrl,
    outfit.imageUrl,
    outfit.wornImageUrl,
  ].filter((u): u is string => Boolean(u));

  const referencePaths = await materializeReferenceUrls(referenceUrls);
  const env = getEnv();

  const job = await startBrowserAgentJob({
    kind: "google_flow_image",
    prompt,
    productName: `${character.identity.displayName} · ${outfitLabel(outfit)}`,
    referencePaths,
    headless: false,
  });

  return jsonOk(
    {
      job,
      prompt,
      referenceCount: referencePaths.length,
      flowUrl: env.googleFlowUrl,
      tip:
        "O navegador abre o Flow com o prompt. Em modo assisted, clique em gerar e salve a imagem — depois use Salvar still no look.",
    },
    { status: 201 },
  );
}
