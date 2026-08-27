import path from "path";
import { promises as fs } from "fs";
import { appendJobLog, createJob, updateJob } from "@/services/browser-agent/jobs";
import {
  getBrowserContext,
  logJob,
} from "@/services/browser-agent/session";
import {
  openCreativeTools,
  runGoogleFlowImage,
  runGoogleFlowVideo,
  runKalodataResearch,
} from "@/services/browser-agent/playbooks";
import type {
  BrowserAgentJob,
  BrowserAgentRunInput,
} from "@/services/browser-agent/types";
import { getEnv } from "@/lib/env";
import { createId } from "@/lib/ids";
import { saveUploadBuffer } from "@/storage/fs";

function agentMode(): "assisted" | "auto" {
  const mode = (process.env.BROWSER_AGENT_MODE || "assisted").toLowerCase();
  return mode === "auto" ? "auto" : "assisted";
}

export async function startBrowserAgentJob(
  input: BrowserAgentRunInput,
): Promise<BrowserAgentJob> {
  const job = await createJob({
    kind: input.kind,
    prompt: input.prompt,
    negativePrompt: input.negativePrompt,
    referencePaths: input.referencePaths || [],
    sourceImagePath: input.sourceImagePath,
    productName: input.productName,
  });

  // Fire and forget — job state is persisted to disk
  void executeJob(job.id, input).catch(async (error) => {
    await updateJob(job.id, {
      status: "failed",
      error: error instanceof Error ? error.message : "Erro no agente",
    });
  });

  return job;
}

async function executeJob(jobId: string, input: BrowserAgentRunInput) {
  await updateJob(jobId, { status: "running" });
  const push = async (line: string) => {
    await appendJobLog(jobId, line);
  };

  const headless = input.headless ?? false;
  const { context, downloadsDir, mode } = await getBrowserContext({ headless });
  await push(
    mode === "dicloak"
      ? "Conectado ao perfil DICloak (Flow/Veo) via CDP."
      : mode === "cdp"
        ? "Conectado via BROWSER_CDP_URL."
        : "Usando Chromium do Playwright (fallback).",
  );
  const page = await context.newPage();

  try {
    if (input.kind === "open_tools") {
      await openCreativeTools({
        contextPages: {
          open: async (url) => {
            const p = await context.newPage();
            await p.goto(url, { waitUntil: "domcontentloaded" });
            return p;
          },
        },
        productName: input.productName,
        onLog: (line) => {
          void push(line);
        },
      });
      await updateJob(jobId, { status: "waiting_user" });
      await push(
        mode === "dicloak"
          ? "Flow aberto no seu perfil DICloak. Faça login se precisar e continue."
          : "Ferramentas abertas. Faça login se necessário e continue no navegador.",
      );
      return;
    }

    if (input.kind === "kalodata_research") {
      const result = await runKalodataResearch({
        page,
        productName: input.productName,
        onLog: (line) => {
          void push(line);
        },
      });
      await updateJob(jobId, { status: result.status });
      return;
    }

    if (input.kind === "google_flow_video") {
      const result = await runGoogleFlowVideo({
        page,
        prompt: input.prompt || "",
        sourceImagePath: input.sourceImagePath,
        downloadsDir,
        mode: agentMode(),
        onLog: (line) => {
          void push(line);
        },
      });
      await finalizeMediaResult(jobId, result);
      return;
    }

    const result = await runGoogleFlowImage({
      page,
      prompt: input.prompt || "",
      negativePrompt: input.negativePrompt,
      referencePaths: input.referencePaths || [],
      downloadsDir,
      mode: agentMode(),
      onLog: (line) => {
        void push(line);
      },
    });
    await finalizeMediaResult(jobId, result);
  } catch (error) {
    logJob((line) => {
      void push(line);
    }, error instanceof Error ? error.message : "Falha no agente");
    await updateJob(jobId, {
      status: "failed",
      error: error instanceof Error ? error.message : "Falha no agente",
    });
  }
}

async function finalizeMediaResult(
  jobId: string,
  result: {
    status: "completed" | "waiting_user" | "failed";
    resultPath?: string;
    error?: string;
  },
) {
  if (result.error) {
    await updateJob(jobId, { status: "failed", error: result.error });
    return;
  }

  if (!result.resultPath) {
    await updateJob(jobId, { status: result.status });
    return;
  }

  const buffer = await fs.readFile(result.resultPath);
  const ext = path.extname(result.resultPath) || ".png";
  const filename = `${createId("flow")}${ext}`;
  const saved = await saveUploadBuffer({
    relativeDir: "generations/agent",
    filename,
    buffer,
  });

  await updateJob(jobId, {
    status: result.status,
    resultImagePath: saved.absolutePath,
    resultImageUrl: saved.publicUrl,
  });
}

export async function resolveLocalPathsFromUrls(
  urls: string[],
): Promise<string[]> {
  const { uploadDir } = getEnv();
  const paths: string[] = [];

  for (const url of urls) {
    if (!url) continue;
    if (url.startsWith("data:")) {
      const materialized = await materializeDataUrl(url);
      if (materialized) paths.push(materialized);
      continue;
    }
    const marker = "/api/files/";
    const idx = url.indexOf(marker);
    if (idx >= 0) {
      const relative = decodeURIComponent(url.slice(idx + marker.length));
      paths.push(path.join(uploadDir, ...relative.split("/")));
    }
  }
  return paths;
}

/** Grava data URL em arquivo temporário para o Playwright enviar ao Flow. */
export async function materializeDataUrl(
  dataUrl: string,
): Promise<string | null> {
  const match = /^data:([^;]+);base64,(.+)$/i.exec(dataUrl);
  if (!match) return null;
  const mime = match[1].toLowerCase();
  const ext =
    mime.includes("png")
      ? ".png"
      : mime.includes("webp")
        ? ".webp"
        : mime.includes("gif")
          ? ".gif"
          : ".jpg";
  const { uploadDir } = getEnv();
  const dir = path.join(uploadDir, "tmp-refs");
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, `${createId("ref")}${ext}`);
  await fs.writeFile(filePath, Buffer.from(match[2], "base64"));
  return filePath;
}

export async function materializeReferenceUrls(
  urls: string[],
): Promise<string[]> {
  return resolveLocalPathsFromUrls(urls.filter(Boolean));
}
