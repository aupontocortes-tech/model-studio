import { NextResponse } from "next/server";
import { jsonError, jsonOk } from "@/lib/api";
import { createId, nowIso } from "@/lib/ids";

type Repo<T extends { id: string }> = {
  all: () => Promise<T[]>;
  get: (id: string) => Promise<T | undefined>;
  upsert: (item: T) => Promise<T>;
  remove: (id: string) => Promise<void>;
};

export function studioCrudHandlers<T extends { id: string; createdAt: string; updatedAt: string }>(
  repo: Repo<T>,
  opts: {
    listKey: string;
    itemKey: string;
    createIdPrefix: string;
    buildCreate: (body: Record<string, unknown>, id: string, now: string) => T | NextResponse;
    buildUpdate: (existing: T, body: Record<string, unknown>, now: string) => T;
  },
) {
  return {
    async GET() {
      const items = await repo.all();
      return jsonOk({ [opts.listKey]: items });
    },
    async POST(request: Request) {
      const body = (await request.json()) as Record<string, unknown>;
      const now = nowIso();
      const id = createId(opts.createIdPrefix);
      const built = opts.buildCreate(body, id, now);
      if (built instanceof NextResponse) return built;
      const item = await repo.upsert(built);
      return jsonOk({ [opts.itemKey]: item }, { status: 201 });
    },
  };
}

export async function studioPatchDelete<T extends { id: string; createdAt: string; updatedAt: string }>(
  repo: Repo<T>,
  id: string,
  request: Request,
  opts: {
    itemKey: string;
    buildUpdate: (existing: T, body: Record<string, unknown>, now: string) => T;
  },
) {
  const existing = await repo.get(id);
  if (!existing) return jsonError("Não encontrado.", 404);

  if (request.method === "DELETE") {
    await repo.remove(id);
    return jsonOk({ ok: true });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const updated = await repo.upsert(
    opts.buildUpdate(existing, body, nowIso()),
  );
  return jsonOk({ [opts.itemKey]: updated });
}

export { jsonError, jsonOk, createId, nowIso };
