import { jsonOk } from "@/lib/api";
import { getEnv } from "@/lib/env";
import {
  CLAUDE_OPERATOR_SYSTEM_PROMPT,
  buildClaudePackMarkdown,
} from "@/services/claude/operatorPrompt";
import {
  characterRepo,
  generationRepo,
  productRepo,
} from "@/storage/repositories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function requestBaseUrl(request: Request): string {
  const envBase = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (envBase) return envBase;
  const host = request.headers.get("host") || "127.0.0.1:3000";
  const proto = request.headers.get("x-forwarded-proto") || "http";
  return `${proto}://${host}`;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("mode") || "pack";
  const generationId = url.searchParams.get("generationId") || undefined;
  const baseUrl = requestBaseUrl(request);
  const env = getEnv();

  if (mode === "prompt" || mode === "system") {
    return jsonOk({
      kind: "claude_operator_prompt",
      prompt: CLAUDE_OPERATOR_SYSTEM_PROMPT,
      howToUse:
        "Cole este texto no Claude (projeto/instruções). Depois peça o pacote em /api/claude-brief ou use o botão no Model Studeo.",
    });
  }

  const generations = (await generationRepo.all()).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
  const generation =
    (generationId
      ? generations.find((g) => g.id === generationId)
      : undefined) || generations[0];

  if (!generation) {
    return jsonOk({
      kind: "claude_brief",
      ready: false,
      systemPrompt: CLAUDE_OPERATOR_SYSTEM_PROMPT,
      markdown: [
        "# Sem geração ainda",
        "",
        "1. Abra http://127.0.0.1:3000/criar",
        "2. Envie avatar + roupa",
        "3. Clique Gerar",
        "4. Volte aqui ou use Copiar briefing Claude",
        "",
        CLAUDE_OPERATOR_SYSTEM_PROMPT,
      ].join("\n"),
      flowUrl: env.googleFlowUrl,
      kalodataUrl: env.kalodataUrl,
    });
  }

  const [product, character] = await Promise.all([
    productRepo.get(generation.productId),
    characterRepo.get(generation.characterId),
  ]);

  const productImageUrls =
    product?.references
      .filter((r) => r.role === "PRODUCT_REFERENCE")
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((r) => r.url) || [];

  const takes =
    generation.videoTakes || generation.config.videoTakePlans || [];

  const pack = {
    generationId: generation.id,
    status: generation.status,
    productName: product?.name,
    characterName: character?.name,
    avatarUrl: character?.primaryImageUrl || null,
    productImageUrls,
    imagePrompt: generation.imagePrompt,
    negativePrompt: generation.negativePrompt,
    videoPrompt: generation.videoPrompt,
    takes,
    speechScript: generation.speechScript,
    kalodataHint: generation.config.scene.kalodataHint,
    flowUrl: env.googleFlowUrl,
    kalodataUrl: env.kalodataUrl,
  };

  const markdown = buildClaudePackMarkdown({
    baseUrl,
    ...pack,
  });

  return jsonOk({
    kind: "claude_brief",
    ready: true,
    baseUrl,
    systemPrompt: CLAUDE_OPERATOR_SYSTEM_PROMPT,
    pack,
    markdown,
    fullBriefing: `${CLAUDE_OPERATOR_SYSTEM_PROMPT}\n\n---\n\n${markdown}`,
  });
}
