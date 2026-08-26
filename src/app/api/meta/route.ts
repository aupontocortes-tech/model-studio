import { jsonOk } from "@/lib/api";
import { SCENE_PRESETS } from "@/domain/scenePresets";
import { getEnv } from "@/lib/env";
import { PIPELINE_STAGES, PIPELINE_LABELS } from "@/pipeline/stages";
import { isDicloakConfigured, probeDicloak } from "@/services/browser-agent/dicloak";
import { neonPing } from "@/db/neon";
import { getDatabaseStatus } from "@/db/status";

export async function GET() {
  const env = getEnv();
  const dicloakConfigured = isDicloakConfigured();
  let dicloakProbe: { ok: boolean; message: string; baseUrl: string } | null =
    null;

  if (dicloakConfigured) {
    const probe = await probeDicloak();
    dicloakProbe = {
      ok: probe.ok,
      message: probe.message,
      baseUrl: probe.baseUrl,
    };
  }

  const browserTarget = dicloakConfigured
    ? "dicloak"
    : env.browserCdpUrl
      ? "cdp"
      : "playwright";

  const database = getDatabaseStatus();
  const neon = database.configured ? await neonPing() : null;

  return jsonOk({
    provider: env.aiProvider,
    browserAgentMode: env.browserAgentMode,
    browserTarget,
    googleFlowUrl: env.googleFlowUrl,
    kalodataUrl: env.kalodataUrl,
    maxUploadBytes: env.maxUploadBytes,
    database: {
      ...database,
      ping: neon,
    },
    dicloak: {
      configured: dicloakConfigured,
      apiUrl: env.dicloakApiUrl,
      profileId: env.dicloakProfileId || null,
      profileSerial: env.dicloakProfileSerial || null,
      apiKeyConfigured: env.dicloakApiKeyConfigured,
      probe: dicloakProbe,
    },
    browserCdpUrlConfigured: Boolean(env.browserCdpUrl),
    scenePresets: SCENE_PRESETS,
    pipeline: PIPELINE_STAGES.map((id) => ({
      id,
      label: PIPELINE_LABELS[id],
    })),
    ctaOptions: [
      "nenhum",
      "carrinho_laranja",
      "conferir_produto",
      "oferta",
      "personalizado",
    ],
    videoStyles: [
      "apresentacao",
      "mostrando_caimento",
      "mirror_selfie",
      "pequena_caminhada",
      "ajuste_da_roupa",
      "frente_lateral",
      "reacao",
      "pov",
      "produto_em_destaque",
    ],
  });
}
