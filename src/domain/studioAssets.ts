/** Assets do studio criativo (banco da personagem + bibliotecas + criação). */

export type StudioMediaKind = "video" | "image";

/** Enquadramento/proporção da foto gerada no try-on. */
export type FramingOption = "face" | "half" | "full";

export const FRAMING_OPTIONS: { id: FramingOption; label: string; hint: string }[] = [
  { id: "face", label: "Rosto", hint: "Enquadramento fechado no rosto/ombros." },
  { id: "half", label: "Corpo médio", hint: "Da coxa pra cima." },
  { id: "full", label: "Corpo inteiro", hint: "Corpo completo, da cabeça aos pés." },
];

export function framingLabel(framing?: FramingOption): string {
  return FRAMING_OPTIONS.find((f) => f.id === framing)?.label || "Corpo inteiro";
}

/** Proporção / tamanho da imagem ou vídeo gerado. */
export type AspectRatioOption = "9:16" | "16:9" | "1:1" | "4:5" | "3:4";

export const ASPECT_RATIO_OPTIONS: {
  id: AspectRatioOption;
  label: string;
  hint: string;
  width: number;
  height: number;
}[] = [
  {
    id: "9:16",
    label: "9:16",
    hint: "TikTok / Reels — principal",
    width: 9,
    height: 16,
  },
  {
    id: "16:9",
    label: "16:9",
    hint: "YouTube / horizontal",
    width: 16,
    height: 9,
  },
  {
    id: "1:1",
    label: "1:1",
    hint: "Quadrado Instagram",
    width: 1,
    height: 1,
  },
  {
    id: "4:5",
    label: "4:5",
    hint: "Feed Instagram vertical",
    width: 4,
    height: 5,
  },
  {
    id: "3:4",
    label: "3:4",
    hint: "Retrato clássico",
    width: 3,
    height: 4,
  },
];

export const DEFAULT_ASPECT_RATIO: AspectRatioOption = "9:16";

export function aspectRatioLabel(aspectRatio?: AspectRatioOption): string {
  return (
    ASPECT_RATIO_OPTIONS.find((o) => o.id === aspectRatio)?.label || "9:16"
  );
}

export function aspectRatioPromptLine(aspectRatio?: AspectRatioOption): string {
  const id = aspectRatio || DEFAULT_ASPECT_RATIO;
  const opt =
    ASPECT_RATIO_OPTIONS.find((o) => o.id === id) || ASPECT_RATIO_OPTIONS[0];
  const orientation =
    opt.height > opt.width
      ? "vertical"
      : opt.width > opt.height
        ? "horizontal"
        : "square";
  return `- Output aspect ratio ${opt.label} (${orientation}, ${opt.hint}). Frame and compose for this exact format.`;
}

export interface CharacterIdentity {
  displayName: string;
  /** Bloco único / prompt de identidade (rosto + corpo). */
  identityPrompt: string;
  ageLabel: string;
  face: string;
  hair: string;
  eyes: string;
  skinTone: string;
  bodyType: string;
  personality: string;
  lockedNotes?: string;
}

/** Item simples no banco da personagem (movimento). */
export interface CharacterLibraryItem {
  id: string;
  name: string;
  prompt: string;
}

/** Voz opcional da personagem. */
export interface CharacterVoice {
  name: string;
  /** Como ela fala / timbre / ritmo — para o prompt. */
  prompt: string;
  notes?: string;
  audioUrl?: string;
}

export interface StudioCharacter {
  id: string;
  projectId?: string;
  identity: CharacterIdentity;
  faceImageUrl?: string;
  bodyImageUrl?: string;
  bodyDetails?: string;
  bodyPrompt?: string;
  /** Guarda-roupa: ids da biblioteca de roupas. */
  outfitIds: string[];
  /** Cenários dela: ids da biblioteca de cenários. */
  sceneIds: string[];
  /** Movimentos organizados só dela. */
  movements: CharacterLibraryItem[];
  /**
   * Cenários locais antigos (texto nela).
   * Preferir sceneIds + biblioteca.
   */
  scenes: CharacterLibraryItem[];
  voice?: CharacterVoice;
  /** @deprecated use faceImageUrl / bodyImageUrl */
  primaryImageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudioOutfit {
  id: string;
  projectId?: string;
  name: string;
  description: string;
  colors?: string;
  /** Foto da peça / roupa separada. */
  imageUrl?: string;
  /** Foto dela já vestida com essa roupa. */
  wornImageUrl?: string;
  /** Fotos extras dela vestida neste look (poses / variações). */
  wornGallery?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface StudioScene {
  id: string;
  projectId?: string;
  name: string;
  description: string;
  lighting?: string;
  /** Foto do lugar (cenário vazio / ambiente). */
  imageUrl?: string;
  /** Foto dela já nesse cenário. */
  inSceneImageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudioMovement {
  id: string;
  projectId?: string;
  name: string;
  description: string;
  cameraHint?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudioScript {
  id: string;
  projectId?: string;
  name: string;
  hook: string;
  body: string;
  cta?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SavedStudioPrompt {
  id: string;
  projectId?: string;
  characterId: string;
  outfitId?: string;
  sceneId?: string;
  movementId?: string;
  scriptId?: string;
  kind?: StudioMediaKind;
  title: string;
  systemPrompt: string;
  userPrompt: string;
  fullPrompt: string;
  createdAt: string;
}

export const CREATIVE_DIRECTOR_SYSTEM_PROMPT = `Você é diretor criativo de conteúdo UGC. Responda em português, com instruções visuais precisas. Preserve SEMPRE a identidade fixa da personagem (rosto, cabelo, olhos, tom de pele, tipo físico e personalidade). Roupa, cenário e movimento podem variar. Se houver voz cadastrada, preserve o timbre.`;

export function emptyVoice(): CharacterVoice {
  return { name: "", prompt: "", notes: "" };
}

export function emptyStudioCharacter(
  id: string,
  now: string,
  name = "Nova personagem",
): StudioCharacter {
  return {
    id,
    identity: {
      displayName: name,
      identityPrompt: "",
      ageLabel: "",
      face: "",
      hair: "",
      eyes: "",
      skinTone: "",
      bodyType: "",
      personality: "",
    },
    bodyDetails: "",
    bodyPrompt: "",
    outfitIds: [],
    sceneIds: [],
    movements: [],
    scenes: [],
    voice: emptyVoice(),
    createdAt: now,
    updatedAt: now,
  };
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    : [];
}

function normalizeVoice(raw: unknown): CharacterVoice | undefined {
  if (!raw || typeof raw !== "object") return emptyVoice();
  const v = raw as CharacterVoice;
  return {
    name: v.name || "",
    prompt: v.prompt || "",
    notes: v.notes || "",
    audioUrl: v.audioUrl,
  };
}

/** Normaliza personagens antigas sem guarda-roupa / voz. */
export function normalizeStudioCharacter(
  raw: StudioCharacter,
): StudioCharacter {
  return {
    ...raw,
    outfitIds: asStringArray(raw.outfitIds),
    sceneIds: asStringArray(raw.sceneIds),
    movements: Array.isArray(raw.movements) ? raw.movements : [],
    scenes: Array.isArray(raw.scenes) ? raw.scenes : [],
    bodyDetails: raw.bodyDetails || "",
    bodyPrompt: raw.bodyPrompt || "",
    faceImageUrl: raw.faceImageUrl || raw.primaryImageUrl,
    bodyImageUrl: raw.bodyImageUrl,
    voice: normalizeVoice(raw.voice),
  };
}

export function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids.filter(Boolean))];
}

export function characterHasVoice(character: StudioCharacter): boolean {
  const v = character.voice;
  return Boolean(v?.prompt?.trim() || v?.audioUrl || v?.name?.trim());
}

/** Nome da roupa é opcional — o visual (foto) é o que identifica. */
export function outfitLabel(
  outfit: Pick<StudioOutfit, "name"> | null | undefined,
): string {
  const name = outfit?.name?.trim();
  return name || "Sem nome";
}

export type OutfitPhotoSlot = "piece" | "worn";

/** Prefere ela vestida; se não tiver, usa a peça. */
export function outfitPreviewUrl(
  outfit: Pick<StudioOutfit, "imageUrl" | "wornImageUrl"> | null | undefined,
): string | undefined {
  return outfit?.wornImageUrl || outfit?.imageUrl;
}

export function outfitWornUrls(
  outfit: Pick<StudioOutfit, "wornImageUrl" | "wornGallery"> | null | undefined,
): string[] {
  if (!outfit) return [];
  const urls = [
    outfit.wornImageUrl,
    ...(outfit.wornGallery || []),
  ].filter((u): u is string => Boolean(u?.trim()));
  return [...new Set(urls)];
}

export type WornPhotoRef = {
  outfitId: string;
  url: string;
  /** primary = capa do look; gallery = foto extra no mesmo look */
  kind: "primary" | "gallery";
  galleryIndex?: number;
};

export function collectWornPhotosForWardrobe(
  outfitIds: string[],
  outfits: StudioOutfit[],
): WornPhotoRef[] {
  const byId = new Map(outfits.map((o) => [o.id, o]));
  const refs: WornPhotoRef[] = [];
  for (const id of outfitIds) {
    const o = byId.get(id);
    if (!o) continue;
    if (o.wornImageUrl) {
      refs.push({ outfitId: id, url: o.wornImageUrl, kind: "primary" });
    }
    (o.wornGallery || []).forEach((url, i) => {
      if (url?.trim()) {
        refs.push({ outfitId: id, url, kind: "gallery", galleryIndex: i });
      }
    });
  }
  return refs;
}

export function normalizeStudioOutfit(raw: StudioOutfit): StudioOutfit {
  const gallery = (raw.wornGallery || []).filter(Boolean);
  return {
    ...raw,
    name: raw.name || "",
    description: raw.description || "",
    imageUrl: raw.imageUrl,
    wornImageUrl: raw.wornImageUrl,
    wornGallery: gallery.length ? gallery : undefined,
  };
}

export function sceneLabel(
  scene: Pick<StudioScene, "name"> | null | undefined,
): string {
  const name = scene?.name?.trim();
  return name || "Sem nome";
}

export type ScenePhotoSlot = "place" | "inScene";
