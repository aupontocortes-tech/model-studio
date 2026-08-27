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

/** Prompt profissional pronto para vestir a roupa do look nela (virtual try-on). */
export const OUTFIT_TRY_ON_SYSTEM = `Professional fashion / UGC image director. Photorealistic still only. Lock the same woman identity from reference photos. Only change the outfit to match the garment reference. No text overlays, no watermarks, no UI.`;

export function buildOutfitTryOnPrompt(input: {
  character: StudioCharacter;
  outfit: StudioOutfit;
  movementPrompt?: string;
  keepSceneFromPhoto?: boolean;
  scene?: StudioScene | null;
}): string {
  const id = input.character.identity;
  const name = id.displayName?.trim() || "a personagem";
  const outfitName = input.outfit.name?.trim() || "o look selecionado";
  const outfitDesc = input.outfit.description?.trim();
  const colors = input.outfit.colors?.trim();
  const identity = id.identityPrompt?.trim();
  const body =
    [input.character.bodyDetails?.trim(), input.character.bodyPrompt?.trim()]
      .filter(Boolean)
      .join(" · ") || "";

  const refs: string[] = [];
  if (input.character.faceImageUrl) {
    refs.push(
      "FACE REFERENCE: use the attached face photo as absolute identity lock (same face, hair, eyes, skin).",
    );
  }
  if (input.character.bodyImageUrl) {
    refs.push(
      "BODY REFERENCE: use the attached body photo for proportions, height feel, and posture baseline.",
    );
  }
  if (input.outfit.imageUrl) {
    refs.push(
      "GARMENT REFERENCE: use the attached piece/clothing photo — copy cut, color, fabric, length, neckline, and details exactly.",
    );
  }
  if (input.outfit.wornImageUrl) {
    refs.push(
      "OPTIONAL WORN REFERENCE: if attached, keep the same woman and improve/replace only the outfit fit while staying consistent.",
    );
  }

  const sceneBlock = input.keepSceneFromPhoto
    ? [
        "BACKGROUND:",
        "- Keep the same environment already visible in her reference photo (do not invent a new location).",
        "- Soft natural residential / UGC lighting unless the reference shows otherwise.",
      ].join("\n")
    : input.scene
      ? [
          "BACKGROUND:",
          `- Scene: ${input.scene.name?.trim() || "selected scene"}${input.scene.description ? ` — ${input.scene.description}` : ""}`,
          input.scene.lighting ? `- Lighting: ${input.scene.lighting}` : "",
          input.scene.imageUrl
            ? "- Use the attached place photo for environment and light."
            : "",
        ]
          .filter(Boolean)
          .join("\n")
      : [
          "BACKGROUND:",
          "- Clean realistic UGC setting that does not compete with the outfit (bedroom mirror, simple room, or soft indoor backdrop).",
        ].join("\n");

  const pose = input.movementPrompt?.trim()
    ? `POSE:\n- ${input.movementPrompt.trim()}`
    : [
        "POSE:",
        "- Full-body or 3/4 body so the complete outfit is readable.",
        "- Natural standing or mirror-selfie attitude, relaxed UGC energy.",
        "- Hands and pose must not hide key garment details.",
      ].join("\n");

  return [
    OUTFIT_TRY_ON_SYSTEM,
    "",
    "TASK: Virtual try-on still. Dress this exact woman in the selected outfit from the wardrobe. Same person. New clothes only.",
    "",
    `SUBJECT: ${name}`,
    identity
      ? `IDENTITY LOCK:\n${identity}`
      : "IDENTITY LOCK:\n- Same face and hair as the face reference.",
    body ? `BODY LOCK:\n${body}` : "",
    "",
    `OUTFIT TO WEAR: ${outfitName}`,
    outfitDesc ? `Outfit details: ${outfitDesc}` : "",
    colors ? `Colors: ${colors}` : "",
    "- Fit the garment realistically to her body (drape, wrinkles, gravity, fabric thickness).",
    "- Do not invent extra accessories unless they are clearly part of the garment photo.",
    "- Remove previous clothing; do not blend old and new outfits.",
    "",
    refs.length
      ? `ATTACHED REFERENCES:\n${refs.map((r) => `- ${r}`).join("\n")}`
      : "",
    "",
    sceneBlock,
    "",
    pose,
    "",
    "CAMERA / OUTPUT:",
    "- Vertical 9:16, photorealistic smartphone photo look.",
    "- Sharp garment detail, natural skin texture, no beauty-filter plastic look.",
    "- No logos invented, no text on image, no watermark.",
    "",
    "NEGATIVE:",
    "different person, face change, age change, wrong hair, distorted hands, extra limbs, mangled clothes, studio catalog mannequin look, heavy CGI, text, watermark.",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

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
