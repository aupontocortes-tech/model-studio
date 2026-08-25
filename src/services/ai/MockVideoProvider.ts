import type {
  GenerationResult,
  VideoGenerationInput,
  VideoGenerationProvider,
} from "@/services/ai/types";

export class MockVideoGenerationProvider implements VideoGenerationProvider {
  readonly name = "mock";

  async generateVideo(input: VideoGenerationInput): Promise<GenerationResult> {
    return {
      provider: this.name,
      status: "completed",
      videoUrl: undefined,
      imageUrl: input.sourceImageUrl,
      meta: {
        mode: "mock",
        note: "Video provider mock — prompt-only until a real provider is wired.",
        durationSeconds: input.durationSeconds,
      },
    };
  }

  async generateFromImage(
    input: VideoGenerationInput,
  ): Promise<GenerationResult> {
    return this.generateVideo(input);
  }
}
