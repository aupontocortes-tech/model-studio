import { jsonError, jsonOk } from "@/lib/api";
import { nowIso } from "@/lib/ids";
import type { Character, CharacterProfile } from "@/domain/types";
import { createRandomCharacterProfile } from "@/services/character/randomizer";
import { characterRepo } from "@/storage/repositories";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const character = await characterRepo.get(id);
  if (!character) return jsonError("Personagem não encontrada.", 404);
  return jsonOk({ character });
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const existing = await characterRepo.get(id);
  if (!existing) return jsonError("Personagem não encontrada.", 404);

  const body = (await request.json()) as Partial<Character> & {
    profile?: Partial<CharacterProfile>;
    randomize?: boolean;
  };

  const profile = body.randomize
    ? createRandomCharacterProfile()
    : { ...existing.profile, ...(body.profile || {}) };

  const updated: Character = {
    ...existing,
    name: body.name?.trim() || existing.name,
    lockIdentity:
      body.lockIdentity !== undefined
        ? Boolean(body.lockIdentity)
        : existing.lockIdentity,
    profile,
    voiceProfile: body.voiceProfile?.trim() ?? existing.voiceProfile,
    updatedAt: nowIso(),
  };

  await characterRepo.upsert(updated);
  return jsonOk({ character: updated });
}
