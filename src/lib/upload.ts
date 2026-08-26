import { getEnv } from "@/lib/env";

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/heic-sequence",
  "image/heif-sequence",
]);

const ALLOWED_EXT = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".heic",
  ".heif",
]);

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
  const mimeOk = ALLOWED_MIME.has(mime) || mime.startsWith("image/");
  const extOk = ALLOWED_EXT.has(ext);

  // Aceita MIME de imagem, extensão conhecida, ou type vazio (comum no iPhone)
  if (!mimeOk && !extOk && mime !== "") {
    return {
      ok: false,
      error: "Tipo de arquivo inválido. Use JPG, PNG, WEBP ou HEIC.",
    };
  }
  if (!mimeOk && !extOk && mime === "" && !ext) {
    return {
      ok: false,
      error: "Não deu para ler o tipo da imagem. Tente JPG ou PNG.",
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

const AUDIO_MIME = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
  "audio/m4a",
  "audio/aac",
]);
const AUDIO_EXT = new Set([".mp3", ".wav", ".webm", ".ogg", ".m4a", ".aac"]);

export function validateAudioUpload(file: {
  name: string;
  type: string;
  size: number;
}): { ok: true } | { ok: false; error: string } {
  const { maxUploadBytes } = getEnv();
  const ext = file.name.includes(".")
    ? `.${file.name.split(".").pop()!.toLowerCase()}`
    : "";
  if (!AUDIO_MIME.has(file.type.toLowerCase()) && !AUDIO_EXT.has(ext)) {
    return { ok: false, error: "Áudio inválido. Use MP3, WAV, M4A, OGG ou WEBM." };
  }
  if (file.size <= 0 || file.size > maxUploadBytes) {
    return {
      ok: false,
      error: `Áudio deve ter até ${Math.round(maxUploadBytes / (1024 * 1024))}MB.`,
    };
  }
  return { ok: true };
}

export function guessImageMime(filename: string, mimeHint?: string): string {
  const hint = (mimeHint || "").toLowerCase();
  if (hint.startsWith("image/") && hint !== "image/*") return hint;
  const ext = filename.includes(".")
    ? `.${filename.split(".").pop()!.toLowerCase()}`
    : "";
  const map: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".heic": "image/heic",
    ".heif": "image/heif",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".m4a": "audio/mp4",
  };
  return map[ext] || "image/jpeg";
}

/** Embeds the photo in the record so the UI does not depend on /api/files. */
export function bufferToDataUrl(
  buffer: Buffer,
  filename: string,
  mimeHint?: string,
): string {
  const mime = guessImageMime(filename, mimeHint);
  return `data:${mime};base64,${buffer.toString("base64")}`;
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
