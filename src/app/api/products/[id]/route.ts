import { jsonError, jsonOk } from "@/lib/api";
import { nowIso } from "@/lib/ids";
import type { Product, ProductSpec } from "@/domain/types";
import { productRepo } from "@/storage/repositories";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const product = await productRepo.get(id);
  if (!product) return jsonError("Produto não encontrado.", 404);
  return jsonOk({ product });
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const existing = await productRepo.get(id);
  if (!existing) return jsonError("Produto não encontrado.", 404);

  const body = (await request.json()) as Partial<Product> & {
    spec?: ProductSpec;
  };

  const updated: Product = {
    ...existing,
    name: body.name?.trim() || existing.name,
    category: body.category ?? existing.category,
    commercialInfo: body.commercialInfo ?? existing.commercialInfo,
    confirmedAttributes:
      body.confirmedAttributes ?? existing.confirmedAttributes,
    spec: body.spec ? { ...existing.spec, ...body.spec } : existing.spec,
    references: body.references ?? existing.references,
    referenceIds: body.referenceIds ?? existing.referenceIds,
    projectId: body.projectId ?? existing.projectId,
    updatedAt: nowIso(),
  };

  await productRepo.upsert(updated);
  return jsonOk({ product: updated });
}
