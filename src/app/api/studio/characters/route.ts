import {
  emptyStudioCharacter,
  normalizeStudioCharacter,
  type StudioCharacter,
} from "@/domain/studioAssets";
import { jsonError, jsonOk, createId, nowIso } from "@/lib/studioCrud";
import { studioCharacterRepo } from "@/storage/studioRepos";

export async function GET() {
  const characters = (await studioCharacterRepo.all()).map((c) =>
    normalizeStudioCharacter(c),
  );
  return jsonOk({ characters });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    displayName?: string;
    identityPrompt?: string;
    bodyDetails?: string;
    bodyPrompt?: string;
    projectId?: string;
  };

  const now = nowIso();
  const name = body.displayName?.trim() || "Nova personagem";
  const character: StudioCharacter = {
    ...emptyStudioCharacter(createId("stchar"), now, name),
    projectId: body.projectId,
    identity: {
      ...emptyStudioCharacter("x", now, name).identity,
      displayName: name,
      identityPrompt: body.identityPrompt?.trim() || "",
    },
    bodyDetails: body.bodyDetails?.trim() || "",
    bodyPrompt: body.bodyPrompt?.trim() || "",
  };
  await studioCharacterRepo.upsert(character);
  return jsonOk({ character }, { status: 201 });
}
