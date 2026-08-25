import { jsonError, jsonOk } from "@/lib/api";
import { createId, nowIso } from "@/lib/ids";
import { safeFilename, validateUpload } from "@/lib/upload";
import type { ProductImageLabel, ReferenceImage, ReferenceRole } from "@/domain/types";
import { saveUploadBuffer } from "@/storage/fs";
import { productRepo, referenceRepo } from "@/storage/repositories";

type Params = { params: Promise<{ id: string }> };

const LABELS: ProductImageLabel[] = [
  "frente",
  "costas",
  "lateral",
  "detalhe",
  "modelo_usando",
  "produto_isolado",
  "referencia_adicional",
];

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const product = await productRepo.get(id);
  if (!product) return jsonError("Produto não encontrado.", 404);

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return jsonError("Arquivo obrigatório.");

  const validation = validateUpload({
    name: file.name,
    type: file.type,
    size: file.size,
  });
  if (!validation.ok) return jsonError(validation.error);

  const labelRaw = String(form.get("label") || "referencia_adicional");
  const label = (LABELS.includes(labelRaw as ProductImageLabel)
    ? labelRaw
    : "referencia_adicional") as ProductImageLabel;
  const role = (String(form.get("role") || "PRODUCT_REFERENCE") as ReferenceRole) ||
    "PRODUCT_REFERENCE";

  const ext = file.name.includes(".")
    ? `.${file.name.split(".").pop()!.toLowerCase()}`
    : ".jpg";
  const filename = `${createId("ref")}_${safeFilename(file.name).replace(/\.[^.]+$/, "")}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const saved = await saveUploadBuffer({
    relativeDir: `products/${id}`,
    filename,
    buffer,
  });

  const ref: ReferenceImage = {
    id: createId("refmeta"),
    productId: id,
    role,
    label,
    filename,
    mimeType: file.type || "image/jpeg",
    sizeBytes: file.size,
    url: saved.publicUrl,
    sortOrder: product.references.length,
    createdAt: nowIso(),
  };

  await referenceRepo.upsert(ref);
  product.references = [...product.references, ref].map((r, i) => ({
    ...r,
    sortOrder: i,
  }));
  product.referenceIds = product.references.map((r) => r.id);
  product.updatedAt = nowIso();
  await productRepo.upsert(product);

  return jsonOk({ reference: ref, product }, { status: 201 });
}
