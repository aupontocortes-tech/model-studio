export type GenerationStatus =
  | "draft"
  | "ready"
  | "generating"
  | "completed"
  | "failed"
  | "rejected"
  | "approved";

export type ReferenceRole =
  | "PRODUCT_REFERENCE"
  | "CHARACTER_REFERENCE"
  | "SCENE_REFERENCE"
  | "POSE_REFERENCE"
  | "MOTION_REFERENCE";

export type ProductImageLabel =
  | "frente"
  | "costas"
  | "lateral"
  | "detalhe"
  | "modelo_usando"
  | "produto_isolado"
  | "referencia_adicional";

export type ScenePresetId =
  | "mirror_selfie"
  | "quarto_creator"
  | "sala"
  | "closet"
  | "street_style"
  | "product_focus";

export type VideoStyleId =
  | "apresentacao"
  | "mostrando_caimento"
  | "mirror_selfie"
  | "pequena_caminhada"
  | "ajuste_da_roupa"
  | "frente_lateral"
  | "reacao"
  | "pov"
  | "produto_em_destaque";

export type CtaMode =
  | "nenhum"
  | "carrinho_laranja"
  | "conferir_produto"
  | "oferta"
  | "personalizado";

export type AttributeSource = "visible" | "seller_claim" | "safe_inference";

export interface ProductSpec {
  category: string;
  product_type: string;
  main_color: string;
  secondary_colors: string[];
  material: string;
  texture: string;
  fit: string;
  length: string;
  sleeves: string;
  neckline: string;
  waist: string;
  closure: string;
  pockets: string;
  print: string;
  visible_branding: string;
  important_details: string[];
  must_preserve: string[];
  must_not_generate: string[];
}

export interface ConfirmedAttribute {
  key: string;
  value: string;
  source: AttributeSource;
}

export interface CharacterProfile {
  apparentAge: string;
  skinTone: string;
  faceShape: string;
  eyeColor: string;
  eyeShape: string;
  hairStyle: string;
  hairLength: string;
  hairTexture: string;
  hairColor: string;
  apparentHeight: string;
  bodyType: string;
  bodyProportion: string;
  makeup: string;
  nails: string;
  earrings: string;
  necklace: string;
  visualStyle: string;
}

export interface SceneConfig {
  presetId: ScenePresetId;
  aspectRatio: "9:16";
  poseHint?: string;
  cameraHint?: string;
  lightingHint?: string;
  environmentHint?: string;
  variationSeed?: number;
  /** Avatar photo already shows the desired scene/background. */
  sceneFromAvatar?: boolean;
  /** User pointed to a Kalodata product instead of (or in addition to) local photos. */
  kalodataHint?: string;
}

export interface ReferenceImage {
  id: string;
  productId?: string;
  characterId?: string;
  role: ReferenceRole;
  label: ProductImageLabel | string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  sortOrder: number;
  createdAt: string;
}

export interface Product {
  id: string;
  projectId?: string;
  name: string;
  category: string;
  commercialInfo: string;
  confirmedAttributes: ConfirmedAttribute[];
  spec: ProductSpec;
  referenceIds: string[];
  references: ReferenceImage[];
  createdAt: string;
  updatedAt: string;
}

export interface Character {
  id: string;
  name: string;
  profile: CharacterProfile;
  lockIdentity: boolean;
  primaryImageUrl?: string;
  /** Voice timbre, accent, pace — unique per character. */
  voiceProfile?: string;
  referenceIds: string[];
  generationIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CharacterCastEntry {
  characterId: string;
  name: string;
  voiceProfile?: string;
  isPrimary?: boolean;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  productIds: string[];
  characterIds: string[];
  generationIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PromptRecord {
  id: string;
  kind: "image" | "negative" | "video" | "speech";
  content: string;
  createdAt: string;
}

export interface VideoTake {
  index: number;
  durationSeconds: 8;
  action: string;
  prompt: string;
}

export interface GenerationConfig {
  scene: SceneConfig;
  lockCharacter: boolean;
  variationIndex: number;
  variationCount: number;
  withSpeech: boolean;
  cta: CtaMode;
  customCta?: string;
  videoStyle?: VideoStyleId;
  tiktokShop: boolean;
  /** What the avatar should do in the video (user-provided). */
  videoAction?: string;
  /** Number of 8-second takes stitched conceptually. */
  videoTakes?: number;
  videoTakePlans?: VideoTake[];
  /** User-pasted dialogue; overrides auto speech when set. */
  customSpeechScript?: string;
  /** Reference video to replicate motion/framing on another avatar. */
  referenceVideoUrl?: string;
  replicateMotionFromVideo?: boolean;
  /** Multiple characters in one production (primary drives image lock). */
  characterCast?: CharacterCastEntry[];
}

export interface Generation {
  id: string;
  projectId?: string;
  productId: string;
  characterId: string;
  status: GenerationStatus;
  provider: string;
  config: GenerationConfig;
  imagePrompt: string;
  negativePrompt: string;
  videoPrompt?: string;
  videoTakes?: VideoTake[];
  speechScript?: string;
  resultImageUrl?: string;
  resultVideoUrl?: string;
  referenceVideoUrl?: string;
  validationNotes?: string;
  parentGenerationId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScenePreset {
  id: ScenePresetId;
  name: string;
  description: string;
  sceneText: string;
  poseText: string;
  cameraText: string;
  lightingText: string;
}

export function emptyProductSpec(): ProductSpec {
  return {
    category: "",
    product_type: "",
    main_color: "",
    secondary_colors: [],
    material: "",
    texture: "",
    fit: "",
    length: "",
    sleeves: "",
    neckline: "",
    waist: "",
    closure: "",
    pockets: "",
    print: "",
    visible_branding: "",
    important_details: [],
    must_preserve: [],
    must_not_generate: [
      "invented pockets",
      "invented seams",
      "invented buttons",
      "invented accessories",
      "wrong garment color",
      "different print",
      "redesigned clothing",
    ],
  };
}
