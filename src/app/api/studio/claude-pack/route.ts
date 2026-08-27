import { jsonError, jsonOk } from "@/lib/api";
import { getEnv } from "@/lib/env";
import {
  CLAUDE_OPERATOR_SYSTEM_PROMPT,
} from "@/services/claude/operatorPrompt";
import { normalizeStudioCharacter, outfitLabel } from "@/domain/studioAssets";
import { buildOutfitTryOnPrompt } from "@/services/prompt/CreativeDirector";
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

/**
 * Pacote para Claude Computer Use: dados da avatar + look + prompt + links.
 * GET ?characterId=&outfitId=&prompt= (prompt opcional — senão monta try-on)
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const characterId = url.searchParams.get("characterId")?.trim();
  const outfitId = url.searchParams.get("outfitId")?.trim();
  const sceneId = url.searchParams.get("sceneId")?.trim();
  const keepSceneFromPhoto = url.searchParams.get("keepSceneFromPhoto") !== "false";
  const movementId = url.searchParams.get("movementId")?.trim();
  const editedPrompt = url.searchParams.get("prompt")?.trim();

  if (!characterId) {
    return jsonError("characterId obrigatório.");
  }
  if (!outfitId) {
    return jsonError("outfitId obrigatório — escolha o look.");
  }

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
    buildOutfitTryOnPrompt({
      character,
      outfit,
      movementPrompt: movement?.prompt,
      keepSceneFromPhoto,
      scene,
    });

  const env = getEnv();
  const baseUrl = requestBaseUrl(request);

  const refs = [
    character.faceImageUrl
      ? `- Rosto: ${character.faceImageUrl.startsWith("data:") ? "(data URL no app — baixe pela Biblioteca ou use o botão Gerar no Flow local)" : `${baseUrl}${character.faceImageUrl}`}`
      : "",
    character.bodyImageUrl
      ? `- Corpo: ${character.bodyImageUrl.startsWith("data:") ? "(data URL no app)" : `${baseUrl}${character.bodyImageUrl}`}`
      : "",
    outfit.imageUrl
      ? `- Peça: ${outfit.imageUrl.startsWith("data:") ? "(data URL no app)" : `${baseUrl}${outfit.imageUrl}`}`
      : "",
    outfit.wornImageUrl
      ? `- Já vestida (se houver): ${outfit.wornImageUrl.startsWith("data:") ? "(data URL no app)" : `${baseUrl}${outfit.wornImageUrl}`}`
      : "",
  ].filter(Boolean);

  const markdown = [
    "# Pacote Claude — Trocar look (try-on)",
    "",
    CLAUDE_OPERATOR_SYSTEM_PROMPT,
    "",
    "---",
    "",
    `## Trabalho atual`,
    `- App: ${baseUrl}/gerar?character=${character.id}`,
    `- Personagem: ${character.identity.displayName} (\`${character.id}\`)`,
    `- Look: ${outfitLabel(outfit)} (\`${outfit.id}\`)`,
    `- Flow: ${env.googleFlowUrl}`,
    "",
    "## Missão",
    "1. Abra o perfil Flow no DICloak (ou Computer Use na janela já aberta).",
    "2. Vá para https://flow.google/",
    "3. Cole o PROMPT abaixo.",
    "4. Anexe as referências (rosto, corpo, peça).",
    "5. Gere a imagem still 9:16.",
    "6. Baixe o still e no Model Studeo use **Enviar still gerado** no look (Ela vestida).",
    "",
    "## Referências",
    refs.length ? refs.join("\n") : "- (sem fotos — complete o banco primeiro)",
    "",
    "## PROMPT (colar no Flow)",
    "```",
    prompt,
    "```",
    "",
    "## APIs úteis",
    `- GET ${baseUrl}/api/studio/claude-pack?characterId=${character.id}&outfitId=${outfit.id}`,
    `- POST ${baseUrl}/api/studio/try-on-flow (só local — abre Flow via agente)`,
    `- POST ${baseUrl}/api/studio/outfits/upload slot=worn — salvar still no look`,
  ].join("\n");

  return jsonOk({
    kind: "studio_try_on_claude_pack",
    ready: true,
    characterId: character.id,
    outfitId: outfit.id,
    prompt,
    markdown,
    flowUrl: env.googleFlowUrl,
    howToUse:
      "Cole o markdown no Claude (Computer Use). Ou no PC local use Gerar no Flow no app.",
  });
}
