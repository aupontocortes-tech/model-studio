import { promises as fs } from "fs";
import path from "path";
import { getEnv } from "@/lib/env";

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

export async function readJsonFile<T>(filename: string, fallback: T): Promise<T> {
  const { dataDir } = getEnv();
  await ensureDir(dataDir);
  const full = path.join(dataDir, filename);
  try {
    const raw = await fs.readFile(full, "utf8");
    if (!raw.trim()) {
      await fs.writeFile(full, JSON.stringify(fallback, null, 2), "utf8");
      return fallback;
    }
    return JSON.parse(raw) as T;
  } catch {
    await fs.writeFile(full, JSON.stringify(fallback, null, 2), "utf8");
    return fallback;
  }
}

export async function writeJsonFile<T>(filename: string, data: T): Promise<void> {
  const { dataDir } = getEnv();
  await ensureDir(dataDir);
  const full = path.join(dataDir, filename);
  await fs.writeFile(full, JSON.stringify(data, null, 2), "utf8");
}

export async function saveUploadBuffer(opts: {
  relativeDir: string;
  filename: string;
  buffer: Buffer;
}): Promise<{ absolutePath: string; publicUrl: string }> {
  const { uploadDir } = getEnv();
  const dir = path.join(uploadDir, opts.relativeDir);
  await ensureDir(dir);
  const absolutePath = path.join(dir, opts.filename);
  await fs.writeFile(absolutePath, opts.buffer);
  const publicUrl = `/api/files/${opts.relativeDir}/${opts.filename}`.replace(
    /\\/g,
    "/",
  );
  return { absolutePath, publicUrl };
}
