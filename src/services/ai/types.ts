export interface ImageGenerationInput {
  prompt: string;
  negativePrompt: string;
  referenceImageUrls: string[];
  aspectRatio: "9:16";
  width?: number;
  height?: number;
}

export interface ImageEditInput extends ImageGenerationInput {
  sourceImageUrl: string;
}

export interface GenerationResult {
  provider: string;
  status: "completed" | "failed";
  imageUrl?: string;
  videoUrl?: string;
  error?: string;
  meta?: Record<string, unknown>;
}

export interface ImageGenerationProvider {
  readonly name: string;
  generateImage(input: ImageGenerationInput): Promise<GenerationResult>;
  editImage(input: ImageEditInput): Promise<GenerationResult>;
  generateFromReferences(input: ImageGenerationInput): Promise<GenerationResult>;
}

export interface VideoGenerationInput {
  prompt: string;
  sourceImageUrl?: string;
  durationSeconds: number;
  aspectRatio: "9:16";
}

export interface VideoGenerationProvider {
  readonly name: string;
  generateVideo(input: VideoGenerationInput): Promise<GenerationResult>;
  generateFromImage(input: VideoGenerationInput): Promise<GenerationResult>;
}
