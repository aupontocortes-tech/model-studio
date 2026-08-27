import { promises as fs } from "fs";
import path from "path";
import { isNeonEnabled, neonReadFile } from "@/db/neon";
import { getEnv } from "@/lib/env";
import { guessImageMime } from "@/lib/upload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ path: string[] }> };

/** Serve fotos/áudios salvos por upload (Neon studio_files ou disco local). */
export async function GET(_request: Request, ctx: Ctx) {
  const { path: segments } = await ctx.params;
  const relativePath = (segments || []).join("/");
  if (!relativePath || relativePath.includes("..")) {
    return new Response("Not found", { status: 404 });
  }

  if (isNeonEnabled()) {
    const file = await neonReadFile(relativePath);
    if (!file) return new Response("Not found", { status: 404 });
    return new Response(new Uint8Array(file.buffer), {
      headers: {
        "Content-Type": file.contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  }

  const { uploadDir } = getEnv();
  const root = path.resolve(uploadDir);
  const full = path.join(root, relativePath);
  if (!full.startsWith(root)) {
    return new Response("Not found", { status: 404 });
  }
  try {
    const buffer = await fs.readFile(full);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": guessImageMime(relativePath),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
