/**
 * Prompt mestre — cole UMA VEZ no Claude (projeto / instruções).
 * Depois só envie os pacotes de trabalho do Model Studeo (/gerar).
 */

export type OrchestratorTarget = "tokfy" | "flow" | "auto";

export const CLAUDE_OPERATOR_SYSTEM_PROMPT = `# Papel
Você é o **operador** do Model Studeo. O app monta personagem, look e prompt; você **executa** nas ferramentas com Computer Use.

# Model Studeo (fonte da verdade)
- UI: URL que vier no pacote (local ou Vercel)
- Personagens, looks, fotos e prompts ficam no app
- Pacote de trabalho: botão **Enviar para Claude** em /gerar ou \`GET /api/studio/claude-pack?characterId=&outfitId=&kind=\`

# Ferramentas (escolha conforme o pacote ou peça do usuário)
1. **Tokfy** — https://tokfy.ai/app/inicio — vídeo + ChatGPT ilimitado (preferido para vídeo e imagem via chat)
2. **Google Flow** — https://flow.google/ — Veo / still (alternativa)
3. **Kalodata** — pesquisa de produto (quando pedido)
4. **Qualquer outra** que o usuário indicar — abra com Computer Use e siga o prompt do pacote

# Fluxo padrão
1. Leia o pacote (personagem, look, prompt, referências, "Onde gerar")
2. Abra a ferramenta indicada no navegador
3. Anexe referências (rosto, corpo, peça) quando existirem
4. Cole o PROMPT do pacote — não reescreva do zero
5. Gere foto ou vídeo 9:16 UGC realista
6. **Foto:** avise o usuário para salvar em **Ela vestida** no look (ou faça upload se tiver acesso ao app)
7. **Vídeo:** entregue o arquivo ou link ao usuário

# Regras
- Roupa da referência é autoritativa (cor, corte, detalhes)
- Mesma personagem em todos os takes
- Vertical 9:16, UGC TikTok realista
- Confirme qual ferramenta abriu e cada etapa concluída

# APIs úteis
- GET /api/studio/claude-pack — pacote atual
- GET /api/meta — URLs e status do app
- GET /api/studio/characters — listar personagens
`;

export function targetLabel(target: OrchestratorTarget): string {
  if (target === "tokfy") return "Tokfy (vídeo + ChatGPT)";
  if (target === "flow") return "Google Flow";
  return "Claude escolhe a melhor";
}

export function buildOrchestratorMission(opts: {
  kind: "image" | "video";
  target: OrchestratorTarget;
  tokfyUrl: string;
  flowUrl: string;
}): string[] {
  const { kind, target, tokfyUrl, flowUrl } = opts;
  const useTokfy = target === "tokfy" || (target === "auto" && kind === "video");
  const useFlow = target === "flow" || (target === "auto" && kind === "image");

  if (useTokfy) {
    return kind === "video"
      ? [
          `1. Abra ${tokfyUrl}`,
          "2. Vá na área de vídeo (ou ChatGPT do Tokfy se for gerar frame primeiro).",
          "3. Anexe referências: rosto, corpo, peça (e still vestida se houver).",
          "4. Cole o PROMPT abaixo e gere o vídeo 9:16.",
          "5. Baixe e avise o usuário.",
        ]
      : [
          `1. Abra ${tokfyUrl}`,
          "2. Use o ChatGPT ilimitado do Tokfy para gerar a FOTO.",
          "3. Anexe referências (rosto, corpo, peça).",
          "4. Cole o PROMPT abaixo.",
          "5. Baixe o still e salve em **Ela vestida** no look no Model Studeo.",
        ];
  }

  if (useFlow) {
    return kind === "video"
      ? [
          `1. Abra ${flowUrl}`,
          "2. Use still vestida como frame se existir.",
          "3. Cole o PROMPT de vídeo e gere.",
          "4. Baixe e avise o usuário.",
        ]
      : [
          `1. Abra ${flowUrl}`,
          "2. Anexe referências (rosto, corpo, peça).",
          "3. Cole o PROMPT e gere still 9:16.",
          "4. Salve em **Ela vestida** no look.",
        ];
  }

  return [
    "1. Escolha Tokfy (vídeo/ChatGPT) ou Flow conforme o tipo.",
    "2. Execute com o PROMPT e referências abaixo.",
    "3. Confirme resultado com o usuário.",
  ];
}

export function buildClaudePackMarkdown(input: {
  baseUrl: string;
  generationId?: string;
  status?: string;
  productName?: string;
  characterName?: string;
  avatarUrl?: string | null;
  productImageUrls?: string[];
  imagePrompt?: string;
  negativePrompt?: string;
  videoPrompt?: string;
  takes?: Array<{ index: number; action: string; prompt: string }>;
  speechScript?: string;
  kalodataHint?: string;
  flowUrl?: string;
  kalodataUrl?: string;
  tokfyUrl?: string;
}): string {
  const abs = (url?: string | null) => {
    if (!url) return "";
    if (url.startsWith("http")) return url;
    return `${input.baseUrl.replace(/\/$/, "")}${url.startsWith("/") ? "" : "/"}${url}`;
  };

  const lines: string[] = [
    `# Pacote Model Studeo → Claude (execução)`,
    ``,
    `Geração: ${input.generationId || "—"}`,
    `Status: ${input.status || "—"}`,
    `Produto: ${input.productName || "—"}`,
    `Personagem: ${input.characterName || "—"}`,
    `Tokfy: ${input.tokfyUrl || "https://tokfy.ai/app/inicio"}`,
    `Flow: ${input.flowUrl || "https://flow.google/"}`,
    `Kalodata: ${input.kalodataUrl || "https://www.kalodata.com/"}`,
    ``,
    `## Referências (anexar na ferramenta)`,
    `- Avatar: ${abs(input.avatarUrl) || "(sem URL)"}`,
  ];

  for (const [i, u] of (input.productImageUrls || []).entries()) {
    lines.push(`- Roupa ${i + 1}: ${abs(u)}`);
  }

  if (input.kalodataHint) {
    lines.push(``, `## Kalodata`, input.kalodataHint);
  }

  lines.push(
    ``,
    `## Prompt IMAGEM (colar na ferramenta primeiro)`,
    "```",
    input.imagePrompt || "(vazio — rode Gerar no Model Studeo)",
    "```",
    ``,
    `## Negative`,
    "```",
    input.negativePrompt || "",
    "```",
  );

  if (input.speechScript) {
    lines.push(``, `## Fala / speech`, input.speechScript);
  }

  if (input.takes?.length) {
    lines.push(``, `## Takes de vídeo (8s cada)`);
    for (const t of input.takes) {
      lines.push(
        ``,
        `### Take ${t.index} — ${t.action}`,
        "```",
        t.prompt,
        "```",
      );
    }
  } else if (input.videoPrompt) {
    lines.push(
      ``,
      `## Prompt VÍDEO completo`,
      "```",
      input.videoPrompt,
      "```",
    );
  }

  lines.push(
    ``,
    `## Instrução rápida para você (Claude)`,
    `1. Abra Tokfy (${input.tokfyUrl || "https://tokfy.ai/app/inicio"}) ou Flow conforme o tipo`,
    `2. Gere IMAGEM com prompt + anexos avatar/roupa`,
    `3. Gere VÍDEO take a take (8s) se aplicável`,
    `4. Se pedirem pesquisa: Kalodata + termo acima`,
  );

  return lines.join("\n");
}
