import { jsonError, jsonOk } from "@/lib/api";
import { getJob } from "@/services/browser-agent/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const job = await getJob(id);
  if (!job) return jsonError("Job não encontrado.", 404);
  return jsonOk({ job });
}
