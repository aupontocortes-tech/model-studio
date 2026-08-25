import { jsonError, jsonOk } from "@/lib/api";
import { nowIso } from "@/lib/ids";
import type { ReferenceImage } from "@/domain/types";
import { productRepo } from "@/storage/repositories";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const product = await productRepo.get(id);
  if (!product) return jsonError("Produto não encontrado.", 404);

  const body = (await request.json()) as {
    orderedIds?: string[];
    updates?: Array<Partial<ReferenceImage> & { id: string }>;
  };

  let refs = [...product.references];

  if (body.orderedIds?.length) {
    refs = body.orderedIds
      .map((rid, index) => {
        const found = refs.find((r) => r.id === rid);
        return found ? { ...found, sortOrder: index } : null;
      })
      .filter(Boolean) as ReferenceImage[];
  }

  if (body.updates?.length) {
    refs = refs.map((r) => {
      const patch = body.updates!.find((u) => u.id === r.id);
      return patch ? { ...r, ...patch, id: r.id } : r;
    });
  }

  product.references = refs.map((r, i) => ({ ...r, sortOrder: i }));
  product.referenceIds = product.references.map((r) => r.id);
  product.updatedAt = nowIso();
  await productRepo.upsert(product);
  return jsonOk({ product });
}
