export const PIPELINE_STAGES = [
  "UPLOAD_PRODUCT",
  "VISUAL_ANALYSIS",
  "PRODUCT_SPEC",
  "MODEL_CONFIG",
  "IMAGE_PROMPT",
  "GENERATE_MODEL",
  "VALIDATION",
  "APPROVED_IMAGE",
  "VIDEO_PROMPT",
  "SPEECH",
  "EXPORT",
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export const PIPELINE_LABELS: Record<PipelineStage, string> = {
  UPLOAD_PRODUCT: "Upload do produto",
  VISUAL_ANALYSIS: "Análise visual",
  PRODUCT_SPEC: "Product Spec",
  MODEL_CONFIG: "Configuração da modelo",
  IMAGE_PROMPT: "Prompt de imagem",
  GENERATE_MODEL: "Geração da modelo",
  VALIDATION: "Validação",
  APPROVED_IMAGE: "Imagem aprovada",
  VIDEO_PROMPT: "Prompt de vídeo",
  SPEECH: "Fala",
  EXPORT: "Exportação",
};
