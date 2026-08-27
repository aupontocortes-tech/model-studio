/**
 * DICloak Local API → CDP endpoint for Playwright.
 * Docs: https://help.dicloak.com/local-api-v2-profile-interface/
 */

export type DicloakStartResult = {
  profileId: string;
  debugPort?: number;
  webSocketUrl: string;
  serialNo?: number;
  name?: string;
};

type DicloakJson = {
  code?: number;
  msg?: string;
  data?: Record<string, unknown>;
};

function apiBase(): string {
  const raw =
    process.env.DICLOAK_API_URL ||
    process.env.DICLOAK_BASE_URL ||
    "http://127.0.0.1:52140";
  return raw.replace(/\/+$/, "").replace(/\/openapi$/i, "");
}

function apiKey(): string {
  return (
    process.env.DICLOAK_API_KEY ||
    process.env.DICLOAK_X_API_KEY ||
    ""
  ).trim();
}

function configuredProfileId(): string {
  return (
    process.env.DICLOAK_PROFILE_ID ||
    process.env.DICLOAK_ENV_ID ||
    ""
  ).trim();
}

function configuredSerial(): string {
  return (
    process.env.DICLOAK_PROFILE_SERIAL ||
    process.env.DICLOAK_SERIAL_NO ||
    ""
  ).trim();
}

export function isDicloakConfigured(): boolean {
  return Boolean(apiKey() && (configuredProfileId() || configuredSerial()));
}

async function dicloakFetch(
  path: string,
  init?: RequestInit,
): Promise<DicloakJson> {
  const key = apiKey();
  if (!key) {
    throw new Error(
      "DICLOAK_API_KEY não configurada. Em DICloak: Mais → Configurações → Open API.",
    );
  }

  const url = `${apiBase()}/openapi${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": key,
      ...(init?.headers || {}),
    },
  });

  const text = await res.text();
  let json: DicloakJson = {};
  try {
    json = JSON.parse(text) as DicloakJson;
  } catch {
    throw new Error(
      `DICloak API em ${url} não respondeu JSON (HTTP ${res.status}). Ative Open API no DICloak e confira DICLOAK_API_URL.`,
    );
  }

  if (!res.ok || (typeof json.code === "number" && json.code !== 0)) {
    throw new Error(
      json.msg ||
        `DICloak API falhou (HTTP ${res.status}, code=${json.code ?? "?"})`,
    );
  }

  return json;
}

async function resolveProfileId(): Promise<{
  id: string;
  serialNo?: number;
  name?: string;
}> {
  const direct = configuredProfileId();
  if (direct) {
    return { id: direct };
  }

  const serial = configuredSerial();
  if (!serial) {
    throw new Error(
      "Defina DICLOAK_PROFILE_ID ou DICLOAK_PROFILE_SERIAL (ex.: 66 do Flow/Veo3).",
    );
  }

  const qs = new URLSearchParams({
    page: "1",
    page_size: "20",
    serial_no: serial,
  });
  const listed = await dicloakFetch(`/v2/profiles?${qs.toString()}`);
  const data = listed.data || {};
  const list = (Array.isArray(data.list) ? data.list : []) as Array<
    Record<string, unknown>
  >;
  const hit =
    list.find((p) => String(p.serial_no ?? p.serial_number) === serial) ||
    list[0];

  if (!hit?.id) {
    throw new Error(
      `Perfil DICloak com número ${serial} não encontrado. Confira o Número na lista do DICloak.`,
    );
  }

  return {
    id: String(hit.id),
    serialNo: Number(hit.serial_no ?? hit.serial_number) || undefined,
    name: hit.name ? String(hit.name) : undefined,
  };
}

async function wsFromDebugPort(port: number): Promise<string> {
  const res = await fetch(`http://127.0.0.1:${port}/json/version`);
  if (!res.ok) {
    throw new Error(
      `Não consegui ler CDP em 127.0.0.1:${port}. No perfil Flow/Veo3, permita Remote Inspector / depuração remota.`,
    );
  }
  const version = (await res.json()) as { webSocketDebuggerUrl?: string };
  if (!version.webSocketDebuggerUrl) {
    throw new Error(`CDP em :${port} sem webSocketDebuggerUrl`);
  }
  return version.webSocketDebuggerUrl;
}

export async function startDicloakProfile(): Promise<DicloakStartResult> {
  const profile = await resolveProfileId();
  const started = await dicloakFetch(`/v2/profiles/${profile.id}/start`, {
    method: "POST",
    body: JSON.stringify({
      headless: false,
      skip_proxy_check: true,
    }),
  });

  const data = started.data || {};
  const debugPortRaw = data.debug_port ?? data.debugPort;
  const debugPort =
    typeof debugPortRaw === "number"
      ? debugPortRaw
      : debugPortRaw
        ? Number(debugPortRaw)
        : undefined;

  let webSocketUrl = String(
    data.web_socket_url || data.webSocketUrl || data.ws || "",
  );

  if (!webSocketUrl && debugPort && Number.isFinite(debugPort)) {
    webSocketUrl = await wsFromDebugPort(debugPort);
  }

  if (!webSocketUrl) {
    throw new Error(
      "DICloak abriu o perfil, mas não devolveu web_socket_url/debug_port. Ative Remote Inspector no perfil Flow/Veo3.",
    );
  }

  return {
    profileId: profile.id,
    debugPort: Number.isFinite(debugPort) ? debugPort : undefined,
    webSocketUrl,
    serialNo: profile.serialNo,
    name: profile.name,
  };
}

export async function probeDicloak(): Promise<{
  ok: boolean;
  message: string;
  baseUrl: string;
  configured: boolean;
}> {
  const baseUrl = apiBase();
  const configured = isDicloakConfigured();
  if (!configured) {
    return {
      ok: false,
      configured: false,
      baseUrl,
      message:
        "Falta DICLOAK_API_KEY + DICLOAK_PROFILE_ID (ou DICLOAK_PROFILE_SERIAL).",
    };
  }

  try {
    await dicloakFetch("/v2/profiles?page=1&page_size=1");
    return {
      ok: true,
      configured: true,
      baseUrl,
      message: "DICloak Local API respondendo.",
    };
  } catch (e) {
    return {
      ok: false,
      configured: true,
      baseUrl,
      message: e instanceof Error ? e.message : "Falha ao falar com DICloak",
    };
  }
}
