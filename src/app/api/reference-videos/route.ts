import { jsonError, jsonOk } from "@/lib/api";
import { createId, nowIso } from "@/lib/ids";
import { safeFilename, validateVideoUpload } from "@/lib/upload";
import { saveUploadBuffer } from "@/storage/fs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return jsonError("Arquivo de vídeo obrigatório.");

  const validation = validateVideoUpload({
    name: file.name,
    type: file.type,
    size: file.size,
  });
  if (!validation.ok) return jsonError(validation.error);

  const ext = file.name.includes(".")
    ? `.${file.name.split(".").pop()!.toLowerCase()}`
    : ".mp4";
  const filename = `${createId("motion")}_${safeFilename(file.name).replace(/\.[^.]+$/, "")}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const saved = await saveUploadBuffer({
    relativeDir: "reference-videos",
    filename,
    buffer,
  });

  return jsonOk(
    {
      referenceVideo: {
        url: saved.publicUrl,
        filename,
        mimeType: file.type || "video/mp4",
        sizeBytes: file.size,
        createdAt: nowIso(),
      },
    },
    { status: 201 },
  );
}
