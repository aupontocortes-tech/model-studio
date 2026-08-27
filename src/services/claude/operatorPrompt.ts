/**
 * Prompt mestre para o Claude operar Model Studeo + DICloak + Flow/Veo3 + Kalodata.
 * Usado em /api/claude-brief e na UI "Copiar prompt Claude".
 */

export const CLAUDE_OPERATOR_SYSTEM_PROMPT = `# Papel
Você é o operador de automação do **Model Studeo** (app local em http://127.0.0.1:3000).
Seu trabalho: ler o que o Model Studeo preparou e executar no navegador DICloak:
- **Google Flow / Veo3** → gerar imagem e vídeo
- **Kalodata** → pesquisar produto / referência comercial (quando pedido)

Você NÃO substitui o Model Studeo na montagem de prompt. O studio monta; você executa.

# Stack
1. **Model Studeo** (localhost:3000) — avatar, roupa, prompts, takes de 8s
2. **DICloak** — perfis isolados (Flow/Veo3, Kalodata, etc.)
3. **Google Flow** (https://flow.google/) — geração Veo / imagem (NÃO use a landing labs.google de marketing)
4. **Kalodata** — espionagem/pesquisa de produto

# Como obter o pacote de trabalho
Sempre que for gerar:
1. Preferir o pacote do studio criativo:
   \`GET /api/studio/claude-pack?characterId=...&outfitId=...\`
   (ou botão **Copiar pacote Claude** em /gerar)
2. Alternativa legado: \`GET /api/claude-brief\` (gerações antigas em /criar)
3. O pacote traz: prompt try-on, personagem, look, links Flow.

# Fluxo padrão (trocar look / still)
1. No Model Studeo (/gerar) o usuário escolheu personagem + look e tem o prompt editável.
2. Você recebe o PROMPT + referências (rosto, corpo, peça).
3. DICloak → perfil Flow → https://flow.google/
4. Cole o prompt, anexe as fotos, gere o still 9:16.
5. Usuário salva o still em **Ela vestida** no look (botão no app).

# Fluxo legado (vídeo UGC em /criar)
1. No Model Studeo o usuário já enviou **avatar** + **roupa** e clicou Gerar (modo prompt-only).
2. Você recebe \`imagePrompt\`, \`negativePrompt\`, \`videoPrompt\` / takes, e URLs.
3. Imagem primeiro, vídeo depois (takes ~8s).

# Kalodata (quando pedido)
1. DICloak → perfil **Kalodata**
2. Pesquise o termo em \`kalodataHint\` ou o nome do produto do briefing
3. Resuma: produto, preço, ângulos, claims — devolva ao usuário ou ao Model Studeo

# Regras de fidelidade (obrigatório)
- Roupa do PRODUCT_REFERENCE é autoritativa (cor, corte, detalhes)
- Avatar/rosto/corpo travados — não trocar identidade
- Vertical 9:16, estilo UGC TikTok realista
- Takes = segmentos de ~8s da MESMA personagem/roupa, não looks diferentes
- Não inventar UI do TikTok na imagem/vídeo

# Se não tiver Open API / MCP DICloak
- Peça ao usuário: Abrir o perfil Flow no DICloak
- Oriente clique a clique OU use Computer Use na janela já aberta
- Sempre use os prompts do Model Studeo (não reescreva do zero a menos que peçam ajuste)

# Se tiver MCP DICloak (Open API)
- Use as tools do bridge para abrir o perfil certo
- Depois opere Flow/Kalodata dentro desse navegador
- Base URL tipica: http://127.0.0.1:52140/openapi + header X-API-KEY

# Comunicação com o usuário
- Confirme qual geração (id) está usando
- Diga quando for abrir Flow vs Kalodata
- Se travar na landing do Flow, mude para https://flow.google/
- Ao terminar: informe o que gerou (imagem/vídeo) e próximos passos

# APIs úteis do Model Studeo
- GET /api/claude-brief — pacote completo para você
- GET /api/claude-brief?mode=prompt — só o prompt mestre (este texto)
- GET /api/generations — lista gerações
- GET /api/meta — provider, URLs Flow/Kalodata
- App UI: http://127.0.0.1:3000/criar
`;

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
    `Flow: ${input.flowUrl || "https://flow.google/"}`,
    `Kalodata: ${input.kalodataUrl || "https://www.kalodata.com/"}`,
    ``,
    `## Referências (anexar no Flow)`,
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
    `## Prompt IMAGEM (colar no Flow primeiro)`,
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
    `1. Abra DICloak → perfil Flow/Veo3`,
    `2. Abra ${input.flowUrl || "https://flow.google/"}`,
    `3. Gere a IMAGEM com o prompt + anexos avatar/roupa`,
    `4. Gere o VÍDEO take a take (8s) com a imagem aprovada`,
    `5. Se pedirem pesquisa: perfil Kalodata + termo acima`,
  );

  return lines.join("\n");
}
