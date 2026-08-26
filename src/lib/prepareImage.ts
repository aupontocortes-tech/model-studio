const MAX_EDGE = 1600;
const MAX_BYTES = 3_500_000;
const START_QUALITY = 0.82;

/** Reduz a foto no navegador para caber no upload e aparecer na tela. */
export async function prepareImageFile(file: File): Promise<File> {
  if (file.type.startsWith("audio/") || file.type.startsWith("video/")) {
    return file;
  }

  const source = await decodeImage(file);
  if (!source) {
    if (file.size > MAX_BYTES) {
      throw new Error(
        "Não deu para ler essa foto. Salve como JPG ou PNG (até 4 MB) e envie de novo.",
      );
    }
    return file;
  }

  const srcW = source.width;
  const srcH = source.height;
  const scale = Math.min(1, MAX_EDGE / Math.max(srcW, srcH));
  const width = Math.max(1, Math.round(srcW * scale));
  const height = Math.max(1, Math.round(srcH * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    closeSource(source);
    return file;
  }
  ctx.drawImage(source, 0, 0, width, height);
  closeSource(source);

  let quality = START_QUALITY;
  let blob = await canvasToJpeg(canvas, quality);
  while (blob && blob.size > MAX_BYTES && quality > 0.45) {
    quality -= 0.12;
    blob = await canvasToJpeg(canvas, quality);
  }

  if (!blob) return file;
  const base = file.name.replace(/\.[^.]+$/, "") || "foto";
  return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), "image/jpeg", quality);
  });
}

type Decoded = { width: number; height: number; close?: () => void } & CanvasImageSource;

async function decodeImage(file: File): Promise<Decoded | null> {
  try {
    const bitmap = await createImageBitmap(file);
    return bitmap;
  } catch {
    /* iPhone HEIC / MIME vazio: tenta via <img> */
  }

  try {
    const url = URL.createObjectURL(file);
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("decode"));
      el.src = url;
    });
    URL.revokeObjectURL(url);
    return img;
  } catch {
    return null;
  }
}

function closeSource(source: Decoded) {
  if (typeof source.close === "function") source.close();
}
