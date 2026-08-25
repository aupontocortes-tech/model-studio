import type {
  GenerationResult,
  ImageEditInput,
  ImageGenerationInput,
  ImageGenerationProvider,
  VideoGenerationInput,
  VideoGenerationProvider,
} from "@/services/ai/types";
import {
  resolveLocalPathsFromUrls,
  startBrowserAgentJob,
} from "@/services/browser-agent/runner";
import { getJob } from "@/services/browser-agent/jobs";

async function waitForJobResult(
  jobId: string,
  timeoutMs = 200_000,
): Promise<GenerationResult> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const job = await getJob(jobId);
    if (!job) {
      return {
        provider: "browser-agent",
        status: "failed",
        error: "Job do agente sumiu.",
      };
    }

    if (job.status === "completed" && job.resultImageUrl) {
      return {
        provider: "browser-agent",
        status: "completed",
        imageUrl: job.resultImageUrl,
        meta: { jobId, logs: job.logs, mode: "browser-agent" },
      };
    }

    if (job.status === "waiting_user") {
      return {
        provider: "browser-agent",
        status: "completed",
        imageUrl: job.resultImageUrl,
        meta: {
          jobId,
          logs: job.logs,
          waitingUser: true,
          note: "Agente abriu o navegador. Conclua a geração no Google Flow se ainda não baixou.",
        },
      };
    }

    if (job.status === "failed") {
      return {
        provider: "browser-agent",
        status: "failed",
        error: job.error || "Agente falhou",
        meta: { jobId, logs: job.logs },
      };
    }

    await new Promise((r) => setTimeout(r, 2000));
  }

  return {
    provider: "browser-agent",
    status: "failed",
    error: "Timeout aguardando o agente no navegador.",
    meta: { jobId },
  };
}

export class BrowserAgentImageProvider implements ImageGenerationProvider {
  readonly name = "browser-agent";

  async generateImage(input: ImageGenerationInput): Promise<GenerationResult> {
    return this.generateFromReferences(input);
  }

  async editImage(input: ImageEditInput): Promise<GenerationResult> {
    return this.generateFromReferences({
      ...input,
      referenceImageUrls: [
        input.sourceImageUrl,
        ...input.referenceImageUrls,
      ],
    });
  }

  async generateFromReferences(
    input: ImageGenerationInput,
  ): Promise<GenerationResult> {
    const referencePaths = await resolveLocalPathsFromUrls(
      input.referenceImageUrls,
    );
    const job = await startBrowserAgentJob({
      kind: "google_flow_image",
      prompt: input.prompt,
      negativePrompt: input.negativePrompt,
      referencePaths,
      headless: false,
    });
    return waitForJobResult(job.id);
  }
}

export class BrowserAgentVideoProvider implements VideoGenerationProvider {
  readonly name = "browser-agent";

  async generateVideo(input: VideoGenerationInput): Promise<GenerationResult> {
    return this.generateFromImage(input);
  }

  async generateFromImage(
    input: VideoGenerationInput,
  ): Promise<GenerationResult> {
    const sourcePaths = input.sourceImageUrl
      ? await resolveLocalPathsFromUrls([input.sourceImageUrl])
      : [];
    const job = await startBrowserAgentJob({
      kind: "google_flow_video",
      prompt: input.prompt,
      sourceImagePath: sourcePaths[0],
      headless: false,
    });
    return waitForJobResult(job.id);
  }
}
