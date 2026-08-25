import type {
  CharacterCastEntry,
  CharacterProfile,
  CtaMode,
  Product,
  ProductSpec,
  SceneConfig,
  VideoStyleId,
} from "@/domain/types";
import { getScenePreset } from "@/domain/scenePresets";
import { describeCharacter } from "@/services/character/randomizer";

const PRODUCT_LOCK = `REFERENCE GARMENT IS AUTHORITATIVE.
Reproduce the exact garment shown in the supplied PRODUCT_REFERENCE images.
Preserve the exact design, colors, cut, proportions, texture, construction and visible details.
The generated woman must wear the referenced garment naturally.
Do not redesign, reinterpret or replace the product.
Do not add details that are absent from the reference.
Do not remove visible details.
Garment fidelity has higher priority than creative styling.`;

const REALISM = `photorealistic adult woman, natural human skin texture, subtle skin pores, natural facial asymmetry, realistic hands, realistic fingers, realistic body proportions, natural hair strands, smartphone photography, authentic UGC, realistic fabric physics, realistic garment folds, natural shadows, real-world lighting, no artificial beauty filter`;

const NEGATIVE = [
  "wrong clothing",
  "different clothing",
  "altered product",
  "wrong garment color",
  "different print",
  "missing clothing details",
  "invented pockets",
  "invented seams",
  "invented buttons",
  "invented accessories",
  "duplicated clothing",
  "extra arms",
  "extra hands",
  "extra fingers",
  "missing fingers",
  "deformed hands",
  "distorted anatomy",
  "CGI",
  "3D render",
  "The Sims",
  "video game character",
  "plastic skin",
  "wax face",
  "doll",
  "mannequin",
  "unrealistic body",
  "fake text",
  "watermark",
  "TikTok interface",
  "shopping interface",
].join(", ");

function describeProductSpec(spec: ProductSpec): string {
  const parts = [
    spec.category && `category: ${spec.category}`,
    spec.product_type && `type: ${spec.product_type}`,
    spec.main_color && `main color: ${spec.main_color}`,
    spec.secondary_colors.length &&
      `secondary colors: ${spec.secondary_colors.join(", ")}`,
    spec.material && `material: ${spec.material}`,
    spec.texture && `texture: ${spec.texture}`,
    spec.fit && `fit: ${spec.fit}`,
    spec.length && `length: ${spec.length}`,
    spec.sleeves && `sleeves: ${spec.sleeves}`,
    spec.neckline && `neckline: ${spec.neckline}`,
    spec.waist && `waist: ${spec.waist}`,
    spec.closure && `closure: ${spec.closure}`,
    spec.pockets && `pockets: ${spec.pockets}`,
    spec.print && `print: ${spec.print}`,
    spec.visible_branding && `visible branding: ${spec.visible_branding}`,
    spec.important_details.length &&
      `important details: ${spec.important_details.join("; ")}`,
    spec.must_preserve.length &&
      `MUST PRESERVE: ${spec.must_preserve.join("; ")}`,
    spec.must_not_generate.length &&
      `MUST NOT GENERATE: ${spec.must_not_generate.join("; ")}`,
  ].filter(Boolean);

  return parts.join("\n");
}

function variationExtras(scene: SceneConfig): string {
  const seed = scene.variationSeed ?? 0;
  const poses = [
    "subtle weight shift onto the right leg",
    "soft three-quarter turn showing silhouette",
    "gentle hand resting near the garment hem",
    "natural crossed ankles standing pose",
  ];
  const cams = [
    "slightly lower smartphone angle",
    "mid-distance full-body vertical framing",
    "closer framing still showing full outfit",
    "mirror-distance framing with room depth",
  ];
  const lights = [
    "soft afternoon window light",
    "warm indoor lamp fill",
    "cooler daylight through sheer curtains",
    "balanced ambient room light",
  ];
  return [
    scene.poseHint || poses[seed % poses.length],
    scene.cameraHint || cams[seed % cams.length],
    scene.lightingHint || lights[seed % lights.length],
    scene.environmentHint || "",
  ]
    .filter(Boolean)
    .join(". ");
}

export class PromptEngine {
  buildImagePrompt(input: {
    product: Product;
    character: CharacterProfile;
    lockCharacter: boolean;
    scene: SceneConfig;
    hasAvatarReference?: boolean;
  }): string {
    const preset = getScenePreset(input.scene.presetId);
    const productBlock = describeProductSpec(input.product.spec);
    const characterBlock = describeCharacter(
      input.character,
      input.lockCharacter,
    );
    const variation = variationExtras(input.scene);
    const sceneFromAvatar = Boolean(input.scene.sceneFromAvatar);
    const kalodata = input.scene.kalodataHint?.trim();

    const avatarLock = input.hasAvatarReference
      ? `AVATAR REFERENCE IS AUTHORITATIVE FOR IDENTITY.
Use the supplied CHARACTER_REFERENCE photo as the exact same woman (face, hair, body, skin).
Keep identity locked. Do not invent a different person.`
      : `CHARACTER:
${characterBlock}`;

    const sceneBlock = sceneFromAvatar
      ? `SCENE (from avatar photo):
Keep the same environment, background, room and framing vibe already present in the CHARACTER_REFERENCE photo.
Do not relocate her to a new set unless the garment change requires a tiny framing adjustment.
Preserve the real scene she is already in.`
      : `SCENE:
${preset.sceneText}
${input.scene.environmentHint || ""}

POSE:
${preset.poseText}
${variation}

CAMERA:
${preset.cameraText}
Aspect ratio 9:16. Vertical UGC smartphone photography.

LIGHTING:
${preset.lightingText}`;

    const productSource = kalodata
      ? `PRODUCT SOURCE NOTE:
Seller indicated this product on Kalodata: ${kalodata}
If PRODUCT_REFERENCE images are also supplied, those images remain authoritative for the garment.`
      : "";

    return `Create an ultra-photorealistic vertical 9:16 smartphone photograph of an adult woman wearing the exact clothing shown in the supplied PRODUCT_REFERENCE.

${PRODUCT_LOCK}

Preserve its exact color, shape, fabric appearance, seams, cut, proportions, length and every visually identifiable construction detail.
Do not redesign the garment.

PRODUCT SPEC (authoritative structured facts):
${productBlock}

${productSource}

The woman should look like a real human being rather than an AI-generated character.
Natural facial asymmetry, natural skin texture, subtle pores, realistic hair strands, realistic hands and anatomically correct fingers.

${avatarLock}

${sceneBlock}

REALISM:
${REALISM}

The garment must fit naturally over the human body with physically believable fabric folds, tension and gravity.
Authentic vertical smartphone photography, realistic exposure, natural lighting, subtle camera imperfections, UGC TikTok creator aesthetic.

No text.
No captions.
No watermark.
No interface.
No fake shopping buttons.
No generated TikTok UI.
No logos unless they are actually present on the reference product.`.trim();
  }

  buildNegativePrompt(spec?: ProductSpec): string {
    const extras = spec?.must_not_generate?.length
      ? `, ${spec.must_not_generate.join(", ")}`
      : "";
    return `${NEGATIVE}${extras}`;
  }

  buildVideoPrompt(input: {
    style: VideoStyleId;
    lockCharacter: boolean;
    productName: string;
    videoAction?: string;
    takeIndex?: number;
    takeTotal?: number;
    referenceVideoUrl?: string;
    replicateMotionFromVideo?: boolean;
  }): string {
    const styleLines: Record<VideoStyleId, string> = {
      apresentacao:
        "She naturally presents the outfit with a subtle weight shift and gentle silhouette reveal.",
      mostrando_caimento:
        "She lightly adjusts the garment to show natural drape and fabric physics.",
      mirror_selfie:
        "She films herself in a full-length mirror with authentic handheld smartphone feeling.",
      pequena_caminhada:
        "She takes a small natural step forward, fabric reacting believably.",
      ajuste_da_roupa:
        "She delicately adjusts the garment at the waist or hem with realistic hand motion.",
      frente_lateral:
        "She slowly turns from front to a slight side angle to show construction.",
      reacao:
        "She gives a subtle natural reaction while keeping identity and outfit locked.",
      pov: "POV-feeling vertical framing while she presents the outfit naturally.",
      produto_em_destaque:
        "Camera emphasis stays on garment fit and details while she moves subtly.",
    };

    return `Generate a vertical 9:16 realistic UGC TikTok-style video (about 8 seconds) using the supplied approved image as the visual identity and clothing reference for product "${input.productName}".
${input.takeIndex && input.takeTotal ? `\nThis is take ${input.takeIndex} of ${input.takeTotal} (8 seconds each). Maintain continuity across takes.` : ""}

Preserve exactly:
* her face;
* hair;
* skin tone;
* body proportions (locked — same measurements every take);
* outfit;
* garment colors;
* garment construction;
* environment identity.

${input.lockCharacter ? "Character identity remains locked for the full clip." : ""}

${input.referenceVideoUrl && input.replicateMotionFromVideo ? `Motion reference: replicate gestures, steps, camera rhythm and timing from the reference video onto this avatar. Do not copy the original actor's face.` : ""}

Motion style: ${input.videoAction?.trim() || styleLines[input.style]}
Include small natural human movement only: weight shift, light garment adjustment, short step, subtle arm motion, hair and fabric reacting physically.
No exaggerated motion, no 360 spin, no dance unless requested, no clothing change, no character morphing, no teleporting, no new objects, no extra hands.

Natural human movement.
Realistic garment physics.
Authentic handheld smartphone feeling.
No sudden camera movement.
No visual text.
No generated TikTok interface.
No shopping UI overlays.`.trim();
  }

  buildVideoTakes(input: {
    style: VideoStyleId;
    lockCharacter: boolean;
    productName: string;
    videoAction?: string;
    videoTakes?: number;
    referenceVideoUrl?: string;
    replicateMotionFromVideo?: boolean;
    characterCast?: CharacterCastEntry[];
    customSpeechScript?: string;
  }): {
    takes: Array<{
      index: number;
      durationSeconds: 8;
      action: string;
      prompt: string;
    }>;
    combinedPrompt: string;
  } {
    const takesCount = Math.min(6, Math.max(1, input.videoTakes || 1));
    const action = input.videoAction?.trim() || "";

    const defaultActions = [
      "Apresenta a roupa de frente, postura natural UGC.",
      "Mostra o caimento com leve ajuste na cintura ou barra.",
      "Gira levemente para lateral e volta, mantendo identidade.",
      "Caminhada curta de 1 passo, tecido reagindo naturalmente.",
      "Close no detalhe da peça sem perder enquadramento vertical.",
      "Finaliza com gesto de CTA natural (sem texto na tela).",
    ];

    let actions: string[] = [];
    if (action) {
      const parts = action
        .split(/\n+|(?:\.\s+)|(?:;\s+)/)
        .map((p) => p.trim())
        .filter((p) => p.length > 4);
      if (parts.length >= takesCount) {
        actions = parts.slice(0, takesCount);
      } else if (parts.length === 1) {
        actions = Array.from({ length: takesCount }, (_, i) =>
          i === 0 ? parts[0] : defaultActions[i] || defaultActions[0],
        );
      } else {
        actions = [...parts];
        while (actions.length < takesCount) {
          actions.push(defaultActions[actions.length] || defaultActions[0]);
        }
      }
    } else {
      actions = defaultActions.slice(0, takesCount);
    }

    const takes = actions.map((act, index) => {
      const prompt = this.buildVideoPrompt({
        style: input.style,
        lockCharacter: input.lockCharacter,
        productName: input.productName,
        videoAction: act,
        takeIndex: index + 1,
        takeTotal: takesCount,
        referenceVideoUrl: input.referenceVideoUrl,
        replicateMotionFromVideo: input.replicateMotionFromVideo,
      });
      return {
        index: index + 1,
        durationSeconds: 8 as const,
        action: act,
        prompt,
      };
    });

    const castBlock =
      input.characterCast && input.characterCast.length > 1
        ? `CHARACTER CAST (${input.characterCast.length}):\n${input.characterCast
            .map(
              (c) =>
                `- ${c.name}${c.isPrimary ? " (primary — image lock)" : ""}${c.voiceProfile ? `: voice ${c.voiceProfile}` : ""}`,
            )
            .join("\n")}\n`
        : "";

    const motionBlock =
      input.referenceVideoUrl && input.replicateMotionFromVideo
        ? `MOTION REFERENCE VIDEO (authoritative for movement):\nReplicate the motion, timing, camera rhythm and gesture sequence from the supplied reference video.\nApply that motion to the PRIMARY avatar identity and outfit — do not copy the original person's face.\nReference: ${input.referenceVideoUrl}\n`
        : "";

    const speechBlock = input.customSpeechScript?.trim()
      ? `SPOKEN DIALOGUE (lip-sync / voice-over):\n${input.customSpeechScript.trim()}\n`
      : "";

    const combinedPrompt = [
      castBlock,
      motionBlock,
      speechBlock,
      takes
        .map(
          (t) =>
            `TAKE ${t.index}/${takes.length} (8s): ${t.action}\n${t.prompt}`,
        )
        .join("\n\n---\n\n"),
    ]
      .filter(Boolean)
      .join("\n\n");

    return { takes, combinedPrompt };
  }

  buildSpeech(input: {
    product: Product;
    cta: CtaMode;
    customCta?: string;
    seed?: number;
    customSpeechScript?: string;
    voiceProfile?: string;
    characterCast?: CharacterCastEntry[];
  }): string {
    if (input.customSpeechScript?.trim()) {
      const voices = [
        input.voiceProfile?.trim()
          ? `Voz principal: ${input.voiceProfile.trim()}`
          : "",
        ...(input.characterCast || [])
          .filter((c) => c.voiceProfile?.trim())
          .map((c) => `${c.name}: ${c.voiceProfile!.trim()}`),
      ].filter(Boolean);
      return [
        input.customSpeechScript.trim(),
        voices.length ? `\nPerfis de voz:\n${voices.join("\n")}` : "",
      ].join("");
    }
    const visible = collectSpeakableFacts(input.product);
    const hooks = [
      "Olha essa peça",
      "Gente, presta atenção nisso",
      "Achei demais essa roupa",
      "Olha o caimento",
    ];
    const middles = visible.length
      ? visible
      : ["bem no estilo do que eu posto no dia a dia"];

    const ctas: Record<CtaMode, string> = {
      nenhum: "",
      carrinho_laranja: "Carrinho laranja aqui embaixo.",
      conferir_produto: "Confere o produto aqui embaixo.",
      oferta: "Se tiver oferta, vale olhar agora.",
      personalizado: input.customCta?.trim() || "Confere aqui embaixo.",
    };

    const seed = input.seed ?? Date.now();
    const hook = hooks[seed % hooks.length];
    const mid = middles[seed % middles.length];
    const cta = ctas[input.cta];

    return [hook, mid, cta].filter(Boolean).join(". ").replace(/\.\./g, ".") + ".";
  }
}

function collectSpeakableFacts(product: Product): string[] {
  const facts: string[] = [];
  const { spec, confirmedAttributes, commercialInfo } = product;

  for (const attr of confirmedAttributes) {
    if (attr.source === "seller_claim") continue;
    if (attr.value.trim()) facts.push(attr.value.trim());
  }

  if (spec.main_color) facts.push(`na cor ${spec.main_color}`);
  if (spec.product_type) facts.push(`é um ${spec.product_type}`);
  if (spec.fit) facts.push(`com caimento ${spec.fit}`);
  if (spec.length) facts.push(`comprimento ${spec.length}`);
  if (spec.material && spec.material.toLowerCase() !== "desconhecido") {
    facts.push(`aspecto de ${spec.material}`);
  }

  // Dados da call / info comercial confirmada pelo seller (frases curtas)
  if (commercialInfo?.trim()) {
    for (const line of commercialInfo.split(/\n+/)) {
      const cleaned = line
        .replace(/^[-•*\d.)\s]+/, "")
        .trim();
      if (cleaned.length >= 8 && cleaned.length <= 120) {
        facts.push(cleaned);
      }
    }
  }

  const banned = [
    "não marca",
    "nao marca",
    "não fica transparente",
    "compressão",
    "tecido premium",
    "modela o corpo",
    "super confortável",
    "super confortavel",
  ];

  return facts.filter(
    (f) => !banned.some((b) => f.toLowerCase().includes(b)),
  );
}

export const promptEngine = new PromptEngine();
