import { jsonError, jsonOk } from "@/lib/api";
import { getEnv } from "@/lib/env";
import {
  buildOrchestratorMission,
  targetLabel,
  type OrchestratorTarget,
} from "@/services/claude/operatorPrompt";
import { normalizeStudioCharacter, outfitLabel, framingLabel, aspectRatioLabel, type FramingOption, type AspectRatioOption } from "@/domain/studioAssets";
import { buildCreativeDirectorPrompt, buildOutfitTryOnPrompt } from "@/services/prompt/CreativeDirector";
import {
  studioCharacterRepo,
  studioOutfitRepo,
  studioSceneRepo,
} from "@/storage/studioRepos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function requestBaseUrl(request: Request): string {
  const envBase = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (envBase) return envBase;
  const host = request.headers.get("host") || "127.0.0.1:3000";
  const proto = request.headers.get("x-forwarded-proto") || "http";
  return `${proto}://${host}`;
}

function parseTarget(raw: string | null, kind: "image" | "video"): OrchestratorTarget {
  if (raw === "tokfy" || raw === "flow" || raw === "auto") return raw;
  return kind === "video" ? "tokfy" : "auto";
}

function refLine(label: string, url: string | undefined, baseUrl: string): string {
  if (!url) return "";
  if (url.startsWith("data:")) {
    return `- ${label}: (foto no app — abra Biblioteca ou use preview no Model Studeo)`;
  }
  const abs = url.startsWith("http") ? url : `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
  return `- ${label}: ${abs}`;
}

/**
 * Pacote compacto para Claude Computer Use.
 * GET ?characterId=&outfitId=&kind=&target=tokfy|flow|auto
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const characterId = url.searchParams.get("characterId")?.trim();
  const outfitId = url.searchParams.get("outfitId")?.trim();
  const sceneId = url.searchParams.get("sceneId")?.trim();
  const keepSceneFromPhoto = url.searchParams.get("keepSceneFromPhoto") !== "false";
  const movementId = url.searchParams.get("movementId")?.trim();
  const editedPrompt = url.searchParams.get("prompt")?.trim();
  const kind = url.searchParams.get("kind") === "video" ? "video" : "image";
  const target = parseTarget(url.searchParams.get("target"), kind);
  const framingRaw = url.searchParams.get("framing");
  const framing: FramingOption | undefined =
    framingRaw === "face" || framingRaw === "half" || framingRaw === "full"
      ? framingRaw
      : undefined;
  const aspectRaw = url.searchParams.get("aspectRatio");
  const aspectRatio: AspectRatioOption | undefined =
    aspectRaw === "9:16" ||
    aspectRaw === "16:9" ||
    aspectRaw === "1:1" ||
    aspectRaw === "4:5" ||
    aspectRaw === "3:4"
      ? aspectRaw
      : undefined;

  if (!characterId) return jsonError("characterId obrigatório.");
  if (!outfitId) return jsonError("outfitId obrigatório — escolha o look.");

  const raw = await studioCharacterRepo.get(characterId);
  if (!raw) return jsonError("Personagem não encontrada.", 404);
  const character = normalizeStudioCharacter(raw);
  const outfit = await studioOutfitRepo.get(outfitId);
  if (!outfit) return jsonError("Look não encontrado.", 404);

  const scene =
    keepSceneFromPhoto || !sceneId
      ? null
      : (await studioSceneRepo.get(sceneId)) || null;
  const movement = movementId
    ? character.movements.find((m) => m.id === movementId)
    : undefined;

  const prompt =
    editedPrompt ||
    (kind === "video"
      ? buildCreativeDirectorPrompt({
          character,
          outfit,
          scene,
          libraryMovementPrompt: movement?.prompt,
          kind: "video",
          keepSceneFromPhoto,
          includeVoice: true,
          aspectRatio,
        }).fullPrompt
      : buildOutfitTryOnPrompt({
          character,
          outfit,
          movementPrompt: movement?.prompt,
          keepSceneFromPhoto,
          scene,
          framing,
          aspectRatio,
        }));

  const env = getEnv();
  const baseUrl = requestBaseUrl(request);

  const refs = [
    refLine("Rosto", character.faceImageUrl, baseUrl),
    refLine("Corpo", character.bodyImageUrl, baseUrl),
    refLine("Peça", outfit.imageUrl, baseUrl),
    refLine("Ela vestida", outfit.wornImageUrl, baseUrl),
  ].filter(Boolean);

  const mission = buildOrchestratorMission({
    kind,
    target,
    tokfyUrl: env.tokfyUrl,
    flowUrl: env.googleFlowUrl,
  });

  const packQuery = new URLSearchParams({
    characterId: character.id,
    outfitId: outfit.id,
    kind,
    target,
  });
  if (editedPrompt) packQuery.set("prompt", editedPrompt);
  if (movementId) packQuery.set("movementId", movementId);
  if (sceneId && !keepSceneFromPhoto) packQuery.set("sceneId", sceneId);
  if (!keepSceneFromPhoto) packQuery.set("keepSceneFromPhoto", "false");
  if (framing) packQuery.set("framing", framing);
  if (aspectRatio) packQuery.set("aspectRatio", aspectRatio);

  const markdown = [
    `# Trabalho Model Studeo`,
    "",
    `- **Tipo:** ${kind === "video" ? "Vídeo" : "Foto (still)"}`,
    `- **Onde gerar:** ${targetLabel(target)}`,
    `- **Formato:** ${aspectRatioLabel(aspectRatio)}`,
    kind === "image" ? `- **Enquadramento:** ${framingLabel(framing)}` : "",
    `- **App:** ${baseUrl}/gerar?character=${character.id}&outfit=${outfit.id}`,
    `- **Personagem:** ${character.identity.displayName} (\`${character.id}\`)`,
    `- **Look:** ${outfitLabel(outfit)} (\`${outfit.id}\`)`,
    "",
    "## Passos",
    mission.join("\n"),
    "",
    "## Referências",
    refs.length ? refs.join("\n") : "- Complete fotos na Biblioteca primeiro",
    "",
    "## PROMPT",
    "```",
    prompt,
    "```",
    "",
    "## Depois de gerar",
    kind === "image"
      ? "Salve o still em **Ela vestida** no look (Biblioteca ou envio manual em /gerar)."
      : "Entregue o vídeo ao usuário.",
    "",
    `_Pacote: GET ${baseUrl}/api/studio/claude-pack?${packQuery.toString()}_`,
  ].join("\n");

  return jsonOk({
    kind: "studio_orchestrator_pack",
    ready: true,
    characterId: character.id,
    outfitId: outfit.id,
    mediaKind: kind,
    target,
    prompt,
    markdown,
    tokfyUrl: env.tokfyUrl,
    flowUrl: env.googleFlowUrl,
    howToUse:
      "Cole no Claude (Computer Use). Configure o prompt mestre uma vez em Configurações.",
  });
}
