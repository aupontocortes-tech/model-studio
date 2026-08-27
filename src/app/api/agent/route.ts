import { jsonError, jsonOk } from "@/lib/api";
import { listJobs } from "@/services/browser-agent/jobs";
import {
  materializeReferenceUrls,
  startBrowserAgentJob,
} from "@/services/browser-agent/runner";
import { closeBrowserContext } from "@/services/browser-agent/session";
import type { BrowserAgentJobKind } from "@/services/browser-agent/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET() {
  const jobs = await listJobs();
  return jsonOk({ jobs });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    action?: "open_tools" | "kalodata" | "flow_image" | "flow_video" | "close";
    prompt?: string;
    negativePrompt?: string;
    productName?: string;
    referencePaths?: string[];
    referenceUrls?: string[];
    sourceImagePath?: string;
  };

  if (body.action === "close") {
    await closeBrowserContext();
    return jsonOk({ closed: true });
  }

  const kindMap: Record<string, BrowserAgentJobKind> = {
    open_tools: "open_tools",
    kalodata: "kalodata_research",
    flow_image: "google_flow_image",
    flow_video: "google_flow_video",
  };

  const kind = kindMap[body.action || "open_tools"];
  if (!kind) return jsonError("Ação do agente inválida.");

  const fromUrls = body.referenceUrls?.length
    ? await materializeReferenceUrls(body.referenceUrls)
    : [];
  const referencePaths = [
    ...(body.referencePaths || []),
    ...fromUrls,
  ];

  const job = await startBrowserAgentJob({
    kind,
    prompt: body.prompt,
    negativePrompt: body.negativePrompt,
    productName: body.productName,
    referencePaths,
    sourceImagePath: body.sourceImagePath,
    headless: false,
  });

  return jsonOk({ job }, { status: 201 });
}
