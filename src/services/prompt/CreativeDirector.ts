import {
  CREATIVE_DIRECTOR_SYSTEM_PROMPT,
  characterHasVoice,
  type SavedStudioPrompt,
  type StudioCharacter,
  type StudioMediaKind,
  type StudioMovement,
  type StudioOutfit,
  type StudioScene,
  type StudioScript,
} from "@/domain/studioAssets";

export function buildCreativeDirectorPrompt(input: {
  character: StudioCharacter;
  outfit?: StudioOutfit | null;
  scene?: StudioScene | null;
  movement?: StudioMovement | null;
  script?: StudioScript | null;
  libraryMovementPrompt?: string;
  libraryScenePrompt?: string;
  extraNotes?: string;
  kind?: StudioMediaKind;
  includeVoice?: boolean;
  /** Mantém o fundo que já está na foto dela (look vestida / ela no cenário). */
  keepSceneFromPhoto?: boolean;
}): { systemPrompt: string; userPrompt: string; fullPrompt: string } {
  const id = input.character.identity;
  const char = input.character;
  const kind: StudioMediaKind = input.kind || "video";
  const isImage = kind === "image";

  const photoLines = [
    char.faceImageUrl ? `- Foto do ROSTO anexada (âncora facial).` : "",
    char.bodyImageUrl
      ? `- Foto do CORPO anexada (âncora de biotipo/proporção).`
      : "",
  ].filter(Boolean);

  const bodyBlock = [
    char.bodyDetails?.trim()
      ? `Detalhes do corpo: ${char.bodyDetails.trim()}`
      : "",
    char.bodyPrompt?.trim()
      ? `Prompt do corpo: ${char.bodyPrompt.trim()}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const identityBlock = [
    `IDENTIDADE FIXA (NÃO ALTERAR):`,
    `- Nome: ${id.displayName || "Personagem"}`,
    id.identityPrompt.trim() || null,
    bodyBlock || null,
    ...photoLines,
  ]
    .filter(Boolean)
    .join("\n");

  const vary: string[] = [];
  if (input.outfit) {
    const outfitName = input.outfit.name?.trim() || "roupa da foto";
    vary.push(
      [
        `ROUPA:`,
        `- ${outfitName}${input.outfit.description ? `: ${input.outfit.description}` : ""}`,
        input.outfit.colors ? `- Cores: ${input.outfit.colors}` : "",
        input.outfit.imageUrl
          ? `- Foto da PEÇA (roupa separada) anexada — copiar corte, cor e tecido.`
          : "",
        input.outfit.wornImageUrl
          ? `- Foto DELA VESTIDA com essa roupa anexada — mesma personagem, mesmo look.`
          : "",
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }
  const sceneText =
    input.libraryScenePrompt?.trim() ||
    (input.scene
      ? `${input.scene.name || "cenário da foto"}: ${input.scene.description}${input.scene.lighting ? ` | Luz: ${input.scene.lighting}` : ""}`
      : "");
  if (input.keepSceneFromPhoto) {
    vary.push(
      [
        `CENÁRIO:`,
        `- Usar o ambiente que JÁ aparece na foto de referência dela (ela vestida / ela no lugar).`,
        `- Não trocar o fundo. Não inventar outro cenário.`,
        input.outfit?.wornImageUrl
          ? `- Âncora: foto dela vestida (o fundo dessa imagem é o cenário).`
          : char.bodyImageUrl
            ? `- Âncora: foto do corpo (o fundo dessa imagem é o cenário).`
            : char.faceImageUrl
              ? `- Âncora: foto do rosto (manter o fundo se aparecer).`
              : "",
      ]
        .filter(Boolean)
        .join("\n"),
    );
  } else if (input.scene || sceneText) {
    vary.push(
      [
        `CENÁRIO:`,
        sceneText ? `- ${sceneText}` : "",
        input.scene?.imageUrl
          ? `- Foto do LUGAR anexada — copiar ambiente, luz e fundo.`
          : "",
        input.scene?.inSceneImageUrl
          ? `- Foto DELA JÁ NESSE CENÁRIO anexada — manter o mesmo lugar.`
          : "",
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }

  const moveText =
    input.libraryMovementPrompt?.trim() ||
    (input.movement
      ? `${input.movement.name}: ${input.movement.description}${input.movement.cameraHint ? ` | Câmera: ${input.movement.cameraHint}` : ""}`
      : "");
  if (moveText) {
    vary.push(
      isImage
        ? `POSE / ATITUDE:\n- ${moveText}`
        : `MOVIMENTO:\n- ${moveText}`,
    );
  }

  if (input.includeVoice !== false && characterHasVoice(char) && char.voice) {
    const v = char.voice;
    vary.push(
      [
        `VOZ:`,
        v.name?.trim() ? `- Nome/timbre: ${v.name.trim()}` : "",
        v.prompt?.trim() ? `- ${v.prompt.trim()}` : "",
        v.notes?.trim() ? `- Notas: ${v.notes.trim()}` : "",
        v.audioUrl ? `- Áudio de referência anexado.` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }

  if (input.script) {
    vary.push(
      `ROTEIRO / FALA:\n- ${input.script.name}\n- Hook: ${input.script.hook}\n- Desenvolvimento: ${input.script.body}${input.script.cta ? `\n- CTA: ${input.script.cta}` : ""}`,
    );
  }
  if (input.extraNotes?.trim()) {
    vary.push(`NOTAS EXTRAS:\n${input.extraNotes.trim()}`);
  }

  const brief = isImage
    ? `Gere um prompt visual detalhado para IMAGEM fotorealista (still), retrato/corpo da personagem, 9:16.`
    : `Gere um prompt visual detalhado para VÍDEO vertical 9:16 (UGC TikTok), fotorealista.`;

  const userPrompt = [
    brief,
    ``,
    identityBlock,
    ``,
    `ELEMENTOS VARIÁVEIS DESTA CENA:`,
    vary.length ? vary.join("\n\n") : "- (nenhum asset variável selecionado)",
    ``,
    `REGRAS:`,
    `- Nunca reinvente rosto, cabelo, olhos, pele ou biotipo.`,
    isImage
      ? `- Descreva pose, enquadramento, luz e expressão. Sem movimento de câmera.`
      : `- Descreva ações e enquadramento com precisão.`,
    `- Sem UI de app, sem texto na tela, sem marca d'água.`,
    `- Saída: um único bloco de prompt pronto para colar no Flow/Veo.`,
  ].join("\n");

  const fullPrompt = `${CREATIVE_DIRECTOR_SYSTEM_PROMPT}\n\n---\n\n${userPrompt}`;

  return {
    systemPrompt: CREATIVE_DIRECTOR_SYSTEM_PROMPT,
    userPrompt,
    fullPrompt,
  };
}

export function titleForSavedPrompt(
  character: StudioCharacter,
  parts: Array<{ name?: string } | null | undefined>,
  kind?: StudioMediaKind,
): string {
  const bits = parts
    .filter(Boolean)
    .map((p) => p!.name?.trim())
    .filter((n): n is string => Boolean(n));
  const prefix = kind === "image" ? "Imagem" : kind === "video" ? "Vídeo" : "";
  return [prefix, character.identity.displayName, ...bits]
    .filter(Boolean)
    .join(" · ")
    .slice(0, 120);
}

export type { SavedStudioPrompt };
