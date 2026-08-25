import { jsonError, jsonOk } from "@/lib/api";
import { createId, nowIso } from "@/lib/ids";
import type { Character, CharacterProfile } from "@/domain/types";
import {
  createRandomCharacterProfile,
  DEFAULT_CHARACTER_PROFILE,
} from "@/services/character/randomizer";
import { characterRepo, projectRepo } from "@/storage/repositories";

export async function GET() {
  const characters = await characterRepo.all();
  return jsonOk({ characters });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    name?: string;
    lockIdentity?: boolean;
    autoGenerate?: boolean;
    profile?: Partial<CharacterProfile>;
    projectId?: string;
  };

  if (!body.name?.trim()) return jsonError("Nome da personagem é obrigatório.");

  const profile = body.autoGenerate
    ? createRandomCharacterProfile()
    : { ...DEFAULT_CHARACTER_PROFILE, ...(body.profile || {}) };

  const now = nowIso();
  const character: Character = {
    id: createId("char"),
    name: body.name.trim(),
    profile,
    lockIdentity: Boolean(body.lockIdentity),
    referenceIds: [],
    generationIds: [],
    createdAt: now,
    updatedAt: now,
  };

  await characterRepo.upsert(character);

  if (body.projectId) {
    const project = await projectRepo.get(body.projectId);
    if (project) {
      project.characterIds = Array.from(
        new Set([...project.characterIds, character.id]),
      );
      project.updatedAt = now;
      await projectRepo.upsert(project);
    }
  }

  return jsonOk({ character }, { status: 201 });
}
