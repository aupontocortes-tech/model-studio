import type {
  GenerationResult,
  ImageEditInput,
  ImageGenerationInput,
  ImageGenerationProvider,
} from "@/services/ai/types";

function placeholderSvg(label: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="1280" viewBox="0 0 720 1280">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1c1917"/>
      <stop offset="100%" stop-color="#44403c"/>
    </linearGradient>
  </defs>
  <rect width="720" height="1280" fill="url(#g)"/>
  <rect x="48" y="48" width="624" height="1184" fill="none" stroke="#a8a29e" stroke-width="2" stroke-dasharray="8 8"/>
  <text x="360" y="560" fill="#fafaf9" font-family="Georgia, serif" font-size="36" text-anchor="middle">MODEL STUDEO MOCK</text>
  <text x="360" y="620" fill="#d6d3d1" font-family="ui-sans-serif, system-ui" font-size="20" text-anchor="middle">9:16 placeholder</text>
  <text x="360" y="680" fill="#a8a29e" font-family="ui-sans-serif, system-ui" font-size="16" text-anchor="middle">${label.replace(/[<>&]/g, "")}</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export class MockImageGenerationProvider implements ImageGenerationProvider {
  readonly name = "mock";

  async generateImage(input: ImageGenerationInput): Promise<GenerationResult> {
    return {
      provider: this.name,
      status: "completed",
      imageUrl: placeholderSvg("generateImage"),
      meta: {
        mode: "mock",
        references: input.referenceImageUrls.length,
        promptChars: input.prompt.length,
      },
    };
  }

  async editImage(input: ImageEditInput): Promise<GenerationResult> {
    return {
      provider: this.name,
      status: "completed",
      imageUrl: placeholderSvg("editImage"),
      meta: { source: input.sourceImageUrl, mode: "mock" },
    };
  }

  async generateFromReferences(
    input: ImageGenerationInput,
  ): Promise<GenerationResult> {
    return {
      provider: this.name,
      status: "completed",
      imageUrl: placeholderSvg(
        `refs:${input.referenceImageUrls.length} · garment locked`,
      ),
      meta: {
        mode: "mock",
        references: input.referenceImageUrls.length,
        negativeChars: input.negativePrompt.length,
      },
    };
  }
}
