import type { PromptVaultItem } from "@/domain/studioAssets";
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

export async function GET() {
  const items = await promptVaultRepo.all();
  items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return jsonOk({ prompts: items });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    title?: string;
    purpose?: string;
    body?: string;
    tags?: unknown;
  };
  const title = body.title?.trim() || "";
  const promptBody = body.body?.trim() || "";
  if (!title) return jsonError("Dê um nome ao prompt.");
  if (!promptBody) return jsonError("Cole o texto do prompt.");

  const now = nowIso();
  const item: PromptVaultItem = {
    id: createId("pvault"),
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
