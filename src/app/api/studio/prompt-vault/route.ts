import type { PromptVaultArea, PromptVaultItem } from "@/domain/studioAssets";
import { jsonError, jsonOk, createId, nowIso } from "@/lib/studioCrud";
import { promptVaultRepo } from "@/storage/studioRepos";

function parseTags(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw
      .map((t) => String(t).trim())
      .filter(Boolean)
      .slice(0, 12);
  }
  if (typeof raw === "string") {
    return raw
      .split(/[,;#]+/)
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 12);
  }
  return [];
}

function normalizeArea(raw: unknown, fallback: PromptVaultArea = "comandos") {
  if (typeof raw !== "string") return fallback;
  const area = raw.trim().toLowerCase();
  return area || fallback;
}

function withArea(item: PromptVaultItem): PromptVaultItem {
  return {
    ...item,
    area: item.area || "comandos",
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const areaFilter = url.searchParams.get("area");
  let items = (await promptVaultRepo.all()).map(withArea);
  if (areaFilter) {
    const wanted = areaFilter.trim().toLowerCase();
    items = items.filter((item) => (item.area || "comandos") === wanted);
  }
  items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return jsonOk({ prompts: items });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    title?: string;
    purpose?: string;
    body?: string;
    tags?: unknown;
    area?: string;
  };
  const title = body.title?.trim() || "";
  const promptBody = body.body?.trim() || "";
  if (!title) return jsonError("Dê um nome ao comando.");
  if (!promptBody) return jsonError("Cole o texto do comando.");

  const now = nowIso();
  const item: PromptVaultItem = {
    id: createId("pvault"),
    area: normalizeArea(body.area, "comandos"),
    title,
    purpose: body.purpose?.trim() || "",
    body: promptBody,
    tags: parseTags(body.tags),
    createdAt: now,
    updatedAt: now,
  };
  await promptVaultRepo.upsert(item);
  return jsonOk({ prompt: item }, { status: 201 });
}
