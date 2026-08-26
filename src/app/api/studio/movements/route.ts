import type { StudioMovement } from "@/domain/studioAssets";
import { jsonError, jsonOk, createId, nowIso } from "@/lib/studioCrud";
import { studioMovementRepo } from "@/storage/studioRepos";

export async function GET() {
  return jsonOk({ movements: await studioMovementRepo.all() });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    name?: string;
    description?: string;
    cameraHint?: string;
    projectId?: string;
  };
  if (!body.name?.trim()) return jsonError("Nome do movimento é obrigatório.");
  const now = nowIso();
  const movement: StudioMovement = {
    id: createId("move"),
    projectId: body.projectId,
    name: body.name.trim(),
    description: body.description?.trim() || "",
    cameraHint: body.cameraHint?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };
  await studioMovementRepo.upsert(movement);
  return jsonOk({ movement }, { status: 201 });
}
