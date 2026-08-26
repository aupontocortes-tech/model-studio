/** Assets do studio criativo (banco da personagem + bibliotecas + criação). */

export type StudioMediaKind = "video" | "image";

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

export function normalizeStudioOutfit(raw: StudioOutfit): StudioOutfit {
  return {
    ...raw,
    name: raw.name || "",
    description: raw.description || "",
    imageUrl: raw.imageUrl,
    wornImageUrl: raw.wornImageUrl,
  };
}

export function sceneLabel(
  scene: Pick<StudioScene, "name"> | null | undefined,
): string {
  const name = scene?.name?.trim();
  return name || "Sem nome";
}

export type ScenePhotoSlot = "place" | "inScene";
