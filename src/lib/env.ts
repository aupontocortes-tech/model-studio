import path from "path";

export function getEnv() {
  const onVercel = Boolean(process.env.VERCEL);
  const dataDir = onVercel
    ? path.join("/tmp", "model-studeo-data")
    : path.resolve(process.cwd(), process.env.DATA_DIR || "data");
  const uploadDir = onVercel
    ? path.join("/tmp", "model-studeo-uploads")
    : path.resolve(process.cwd(), process.env.UPLOAD_DIR || "uploads");

  return {
    aiProvider: (process.env.AI_PROVIDER || "mock").toLowerCase(),
    browserAgentMode: (process.env.BROWSER_AGENT_MODE || "assisted").toLowerCase(),
    googleFlowUrl:
      process.env.GOOGLE_FLOW_URL || "https://flow.google/",
    tokfyUrl: process.env.TOKFY_URL || "https://tokfy.ai/app/inicio",
    kalodataUrl: process.env.KALODATA_URL || "https://www.kalodata.com/",
    maxUploadBytes: Number(process.env.MAX_UPLOAD_BYTES || 8_388_608),
    dataDir,
    uploadDir,
    dicloakApiUrl: (
      process.env.DICLOAK_API_URL ||
      process.env.DICLOAK_BASE_URL ||
      "http://127.0.0.1:52140"
    ).replace(/\/+$/, ""),
    dicloakApiKeyConfigured: Boolean(
      (
        process.env.DICLOAK_API_KEY ||
        process.env.DICLOAK_X_API_KEY ||
        ""
      ).trim(),
    ),
    dicloakProfileId: (
      process.env.DICLOAK_PROFILE_ID ||
      process.env.DICLOAK_ENV_ID ||
      ""
    ).trim(),
    dicloakProfileSerial: (
      process.env.DICLOAK_PROFILE_SERIAL ||
      process.env.DICLOAK_SERIAL_NO ||
      ""
    ).trim(),
    browserCdpUrl: (
      process.env.BROWSER_CDP_URL ||
      process.env.PLAYWRIGHT_CDP_URL ||
      ""
    ).trim(),
  };
}
