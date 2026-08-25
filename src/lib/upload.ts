import { getEnv } from "@/lib/env";

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

const ALLOWED_EXT = new Set([".jpg", ".jpeg", ".png", ".webp"]);

export function validateUpload(file: {
  name: string;
  type: string;
  size: number;
}): { ok: true } | { ok: false; error: string } {
  const { maxUploadBytes } = getEnv();
  const ext = file.name.includes(".")
    ? `.${file.name.split(".").pop()!.toLowerCase()}`
    : "";
  const mime = (file.type || "").toLowerCase();
  const mimeOk = ALLOWED_MIME.has(mime);
  const extOk = ALLOWED_EXT.has(ext);

  // Aceita se tiver MIME válido OU extensão válida (alguns apps mandam type vazio)
  if (!mimeOk && !extOk) {
    return {
      ok: false,
      error: "Tipo de arquivo inválido. Use JPG, PNG ou WEBP.",
    };
  }

  if (file.size <= 0 || file.size > maxUploadBytes) {
    return {
      ok: false,
      error: `Arquivo deve ter até ${Math.round(maxUploadBytes / (1024 * 1024))}MB.`,
    };
  }

  return { ok: true };
}

export function safeFilename(original: string): string {
  const cleaned = original
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
  return cleaned || "image.jpg";
}

const VIDEO_MIME = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);
const VIDEO_EXT = new Set([".mp4", ".webm", ".mov"]);

export function validateVideoUpload(file: {
  name: string;
  type: string;
  size: number;
}): { ok: true } | { ok: false; error: string } {
  const { maxUploadBytes } = getEnv();
  const maxVideo = Math.max(maxUploadBytes, 50 * 1024 * 1024);
  const ext = file.name.includes(".")
    ? `.${file.name.split(".").pop()!.toLowerCase()}`
    : "";

  if (!VIDEO_MIME.has(file.type.toLowerCase()) && !VIDEO_EXT.has(ext)) {
    return {
      ok: false,
      error: "Vídeo inválido. Use MP4, WEBM ou MOV.",
    };
  }

  if (file.size <= 0 || file.size > maxVideo) {
    return {
      ok: false,
      error: `Vídeo deve ter até ${Math.round(maxVideo / (1024 * 1024))}MB.`,
    };
  }

  return { ok: true };
}
