import { jsonError, jsonOk } from "@/lib/api";
import { createId, nowIso } from "@/lib/ids";
import type { Project } from "@/domain/types";
import { projectRepo } from "@/storage/repositories";

export async function GET() {
  const projects = await projectRepo.all();
  return jsonOk({ projects });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    name?: string;
    description?: string;
  };
  if (!body.name?.trim()) return jsonError("Nome do projeto é obrigatório.");

  const now = nowIso();
  const project: Project = {
    id: createId("proj"),
    name: body.name.trim(),
    description: body.description?.trim() || "",
    productIds: [],
    characterIds: [],
    generationIds: [],
    createdAt: now,
    updatedAt: now,
  };
  await projectRepo.upsert(project);
  return jsonOk({ project }, { status: 201 });
}
