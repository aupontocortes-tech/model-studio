import { promises as fs } from "fs";
import path from "path";
import { getEnv } from "@/lib/env";
import { isNeonEnabled, neonSaveFile } from "@/db/neon";

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

function guessContentType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const map: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".webm": "audio/webm",
    ".ogg": "audio/ogg",
    ".m4a": "audio/mp4",
    ".aac": "audio/aac",
  };
  return map[ext] || "application/octet-stream";
}

export async function readJsonFile<T>(filename: string, fallback: T): Promise<T> {
  const { dataDir } = getEnv();
  await ensureDir(dataDir);
  const full = path.join(dataDir, filename);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const raw = await fs.readFile(full, "utf8");
      if (!raw.trim()) {
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 40 * (attempt + 1)));
          continue;
        }
        return fallback;
      }
      return JSON.parse(raw) as T;
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === "ENOENT") {
        await fs.writeFile(full, JSON.stringify(fallback, null, 2), "utf8");
        return fallback;
      }
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 40 * (attempt + 1)));
        continue;
      }
      return fallback;
    }
  }
  return fallback;
}

export async function writeJsonFile<T>(filename: string, data: T): Promise<void> {
  const { dataDir } = getEnv();
  await ensureDir(dataDir);
  const full = path.join(dataDir, filename);
  const tmp = `${full}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
  try {
    await fs.rename(tmp, full);
  } catch {
    await fs.copyFile(tmp, full);
    await fs.unlink(tmp).catch(() => undefined);
  }
}

export async function saveUploadBuffer(opts: {
  relativeDir: string;
  filename: string;
  buffer: Buffer;
}): Promise<{ absolutePath: string; publicUrl: string }> {
  const relativePath = path
    .join(opts.relativeDir, opts.filename)
    .replace(/\\/g, "/");
  const publicUrl = `/api/files/${relativePath}`;

  if (isNeonEnabled()) {
    await neonSaveFile({
      relativePath,
      buffer: opts.buffer,
      contentType: guessContentType(opts.filename),
    });
    return { absolutePath: relativePath, publicUrl };
  }

  const { uploadDir } = getEnv();
  const dir = path.join(uploadDir, opts.relativeDir);
  await ensureDir(dir);
  const absolutePath = path.join(dir, opts.filename);
  await fs.writeFile(absolutePath, opts.buffer);
  return { absolutePath, publicUrl };
}
