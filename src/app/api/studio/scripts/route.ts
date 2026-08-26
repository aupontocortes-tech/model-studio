import type { StudioScript } from "@/domain/studioAssets";
import { jsonError, jsonOk, createId, nowIso } from "@/lib/studioCrud";
import { studioScriptRepo } from "@/storage/studioRepos";

export async function GET() {
  return jsonOk({ scripts: await studioScriptRepo.all() });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    name?: string;
    hook?: string;
    body?: string;
    cta?: string;
    projectId?: string;
  };
  if (!body.name?.trim()) return jsonError("Nome do roteiro é obrigatório.");
  const now = nowIso();
  const script: StudioScript = {
    id: createId("script"),
    projectId: body.projectId,
    name: body.name.trim(),
    hook: body.hook?.trim() || "",
    body: body.body?.trim() || "",
    cta: body.cta?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };
  await studioScriptRepo.upsert(script);
  return jsonOk({ script }, { status: 201 });
}
