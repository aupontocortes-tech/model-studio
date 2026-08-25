import { jsonError, jsonOk } from "@/lib/api";
import { nowIso } from "@/lib/ids";
import { analyzeProductReferences } from "@/services/analysis/productAnalysis";
import { productRepo } from "@/storage/repositories";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const { id } = await params;
  const product = await productRepo.get(id);
  if (!product) return jsonError("Produto não encontrado.", 404);

  const spec = analyzeProductReferences({
    productName: product.name,
    category: product.category,
    commercialInfo: product.commercialInfo,
    labels: product.references.map((r) => String(r.label)),
  });

  product.spec = { ...product.spec, ...spec, category: product.category || spec.category };
  product.updatedAt = nowIso();
  await productRepo.upsert(product);

  return jsonOk({ product, stage: "PRODUCT_SPEC" });
}
