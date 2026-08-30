import { jsonError, jsonOk, createId } from "@/lib/studioCrud";
import {
  safeFilename,
  validateUpload,
  validateVideoUpload,
} from "@/lib/upload";
import { saveUploadBuffer } from "@/storage/fs";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return jsonError("Arquivo obrigatório.");

    const isVideo =
      file.type.startsWith("video/") || /\.(mp4|webm|mov)$/i.test(file.name);
    const validation = isVideo
      ? validateVideoUpload(file)
      : validateUpload(file);
    if (!validation.ok) return jsonError(validation.error);

    const clipId = String(form.get("clipId") || createId("clip"));
    const slot = String(form.get("slot") || (isVideo ? "video" : "start"));
    const ext = file.name.includes(".")
      ? `.${file.name.split(".").pop()!.toLowerCase()}`
      : isVideo
        ? ".mp4"
        : ".jpg";
    const saved = await saveUploadBuffer({
      relativeDir: `studio-video/${safeFilename(clipId)}`,
      filename: safeFilename(`${slot}_${createId("asset")}${ext}`),
      buffer: Buffer.from(await file.arrayBuffer()),
      mimeHint: file.type,
    });

    return jsonOk({
      url: saved.publicUrl,
      kind: isVideo ? "video" : "image",
    });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Falha no upload.",
      500,
    );
  }
}
