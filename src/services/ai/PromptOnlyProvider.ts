import type {
  GenerationResult,
  ImageEditInput,
  ImageGenerationInput,
  ImageGenerationProvider,
  VideoGenerationInput,
  VideoGenerationProvider,
} from "@/services/ai/types";

/**
 * Monta prompts sem abrir navegador — para colar manualmente no Flow/Veo
 * (ex.: perfil DICloak onde o usuário já tem acesso).
 */
export class PromptOnlyImageProvider implements ImageGenerationProvider {
  readonly name = "prompt-only";

  async generateImage(_input: ImageGenerationInput): Promise<GenerationResult> {
    return this.ready();
  }

  async editImage(_input: ImageEditInput): Promise<GenerationResult> {
    return this.ready();
  }

  async generateFromReferences(
    _input: ImageGenerationInput,
  ): Promise<GenerationResult> {
    return this.ready();
  }

  private ready(): GenerationResult {
    return {
      provider: "prompt-only",
      status: "completed",
      meta: {
        mode: "manual-flow",
        note: "Prompt pronto. Copie e cole no Google Flow / Veo (DICloak).",
      },
    };
  }
}

export class PromptOnlyVideoProvider implements VideoGenerationProvider {
  readonly name = "prompt-only";

  async generateVideo(_input: VideoGenerationInput): Promise<GenerationResult> {
    return this.ready();
  }

  async generateFromImage(
    _input: VideoGenerationInput,
  ): Promise<GenerationResult> {
    return this.ready();
  }

  private ready(): GenerationResult {
    return {
      provider: "prompt-only",
      status: "completed",
      meta: {
        mode: "manual-flow",
        note: "Prompt de vídeo pronto para colar no Flow / Veo.",
      },
    };
  }
}
