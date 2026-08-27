import {
  emptyStudioCharacter,
  normalizeStudioCharacter,
  type StudioCharacter,
} from "@/domain/studioAssets";
import { jsonError, jsonOk, createId, nowIso } from "@/lib/studioCrud";
import { isNeonEnabled } from "@/db/neon";
import { studioCharacterRepo } from "@/storage/studioRepos";

const VERCEL_NO_NEON =
  "Na Vercel o DATABASE_URL ainda é inválido (placeholder HOST). Personagens e fotos somem entre requisições. Em Vercel → Settings → Environment Variables, cole a connection string real do Neon (com -pooler) e faça Redeploy.";

export async function GET() {
  try {
    const characters = (await studioCharacterRepo.all()).map((c) =>
      normalizeStudioCharacter(c),
    );
    return jsonOk({
      characters,
      storageWarning:
        process.env.VERCEL && !isNeonEnabled() ? VERCEL_NO_NEON : undefined,
    });
  } catch (e) {
    return jsonError(
      e instanceof Error ? e.message : "Falha ao listar personagens.",
      500,
    );
  }
}

export async function POST(request: Request) {
  try {
    if (process.env.VERCEL && !isNeonEnabled()) {
      return jsonError(VERCEL_NO_NEON, 503);
    }

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
  } catch (e) {
    return jsonError(
      e instanceof Error ? e.message : "Falha ao criar personagem.",
      500,
    );
  }
}
