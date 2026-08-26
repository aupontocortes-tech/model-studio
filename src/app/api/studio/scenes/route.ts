import type { StudioScene } from "@/domain/studioAssets";
import { jsonError, jsonOk, createId, nowIso } from "@/lib/studioCrud";
import { studioSceneRepo } from "@/storage/studioRepos";

export async function GET() {
  return jsonOk({ scenes: await studioSceneRepo.all() });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    name?: string;
    description?: string;
    lighting?: string;
    imageUrl?: string;
    inSceneImageUrl?: string;
    projectId?: string;
  };
  const now = nowIso();
  const scene: StudioScene = {
    id: createId("scene"),
    projectId: body.projectId,
    name: body.name?.trim() || "",
    description: body.description?.trim() || "",
    lighting: body.lighting?.trim() || undefined,
    imageUrl: body.imageUrl,
    inSceneImageUrl: body.inSceneImageUrl,
    createdAt: now,
    updatedAt: now,
  };
  if (
    !scene.name &&
    !scene.description &&
    !scene.imageUrl &&
    !scene.inSceneImageUrl
  ) {
    return jsonError("Envie a foto do lugar ou dela no cenário, um nome ou um prompt.");
  }
  await studioSceneRepo.upsert(scene);
  return jsonOk({ scene }, { status: 201 });
}
