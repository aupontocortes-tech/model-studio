import { jsonError, jsonOk } from "@/lib/api";
import { createId, nowIso } from "@/lib/ids";
import { emptyProductSpec, type Product } from "@/domain/types";
import { productRepo, projectRepo } from "@/storage/repositories";

export async function GET() {
  const products = await productRepo.all();
  return jsonOk({ products });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    name?: string;
    category?: string;
    commercialInfo?: string;
    projectId?: string;
  };
  if (!body.name?.trim()) return jsonError("Nome do produto é obrigatório.");

  const now = nowIso();
  const product: Product = {
    id: createId("prod"),
    projectId: body.projectId,
    name: body.name.trim(),
    category: body.category?.trim() || "",
    commercialInfo: body.commercialInfo?.trim() || "",
    confirmedAttributes: [],
    spec: emptyProductSpec(),
    referenceIds: [],
    references: [],
    createdAt: now,
    updatedAt: now,
  };
  product.spec.category = product.category;
  await productRepo.upsert(product);

  if (body.projectId) {
    const project = await projectRepo.get(body.projectId);
    if (project) {
      project.productIds = Array.from(
        new Set([...project.productIds, product.id]),
      );
      project.updatedAt = now;
      await projectRepo.upsert(project);
    }
  }

  return jsonOk({ product }, { status: 201 });
}
