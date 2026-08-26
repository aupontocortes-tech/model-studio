import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";
import { isNeonEnabled, neonReadFile } from "@/db/neon";

type Params = { params: Promise<{ path: string[] }> };

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".webm": "audio/webm",
  ".ogg": "audio/ogg",
  ".m4a": "audio/mp4",
};

export async function GET(_request: Request, { params }: Params) {
  const { path: parts } = await params;
  if (!parts?.length) {
    return NextResponse.json({ error: "Arquivo não encontrado." }, { status: 404 });
  }

  const relativePath = parts.join("/");

  if (isNeonEnabled()) {
    const file = await neonReadFile(relativePath);
    if (!file) {
      return NextResponse.json({ error: "Arquivo não encontrado." }, { status: 404 });
    }
    return new NextResponse(new Uint8Array(file.buffer), {
      headers: {
        "Content-Type": file.contentType,
        "Cache-Control": "public, max-age=3600",
      },
    });
  }

  const { uploadDir } = getEnv();
  const resolvedRoot = path.resolve(uploadDir);
  const target = path.resolve(uploadDir, ...parts);

  if (!target.startsWith(resolvedRoot)) {
    return NextResponse.json({ error: "Caminho inválido." }, { status: 400 });
  }

  try {
    const data = await fs.readFile(target);
    const ext = path.extname(target).toLowerCase();
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": MIME[ext] || "application/octet-stream",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Arquivo não encontrado." }, { status: 404 });
  }
}
