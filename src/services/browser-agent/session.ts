import { promises as fs } from "fs";
import path from "path";
import {
  chromium,
  type Browser,
  type BrowserContext,
  type Page,
} from "playwright";
import { getEnv } from "@/lib/env";
import {
  isDicloakConfigured,
  startDicloakProfile,
} from "@/services/browser-agent/dicloak";

let sharedContext: BrowserContext | null = null;
let sharedBrowser: Browser | null = null;
let connectionMode: "dicloak" | "cdp" | "playwright" = "playwright";

async function ensureDirs() {
  const { dataDir } = getEnv();
  const profileDir = path.join(dataDir, "browser-profile");
  const downloadsDir = path.join(dataDir, "browser-downloads");
  await fs.mkdir(profileDir, { recursive: true });
  await fs.mkdir(downloadsDir, { recursive: true });
  return { profileDir, downloadsDir };
}

function configuredCdpUrl(): string {
  return (
    process.env.BROWSER_CDP_URL ||
    process.env.PLAYWRIGHT_CDP_URL ||
    ""
  ).trim();
}

async function connectOverCdp(
  endpoint: string,
): Promise<{ context: BrowserContext; browser: Browser }> {
  const browser = await chromium.connectOverCDP(endpoint);
  const context = browser.contexts()[0] || (await browser.newContext());
  context.setDefaultTimeout(60_000);
  return { context, browser };
}

export function getConnectionMode(): "dicloak" | "cdp" | "playwright" {
  return connectionMode;
}

export async function getBrowserContext(opts?: {
  headless?: boolean;
}): Promise<{
  context: BrowserContext;
  downloadsDir: string;
  mode: "dicloak" | "cdp" | "playwright";
}> {
  const { profileDir, downloadsDir } = await ensureDirs();
  const headless = opts?.headless ?? false;

  if (sharedContext) {
    return { context: sharedContext, downloadsDir, mode: connectionMode };
  }

  // 1) DICloak Local API → open/reuse Flow profile and attach via CDP
  if (isDicloakConfigured()) {
    const started = await startDicloakProfile();
    const { context, browser } = await connectOverCdp(started.webSocketUrl);
    sharedContext = context;
    sharedBrowser = browser;
    connectionMode = "dicloak";
    return { context, downloadsDir, mode: connectionMode };
  }

  // 2) Direct CDP (ws:// or http://127.0.0.1:PORT)
  const cdpUrl = configuredCdpUrl();
  if (cdpUrl) {
    const { context, browser } = await connectOverCdp(cdpUrl);
    sharedContext = context;
    sharedBrowser = browser;
    connectionMode = "cdp";
    return { context, downloadsDir, mode: connectionMode };
  }

  // 3) Fallback: Playwright Chromium próprio
  sharedContext = await chromium.launchPersistentContext(profileDir, {
    headless,
    acceptDownloads: true,
    viewport: { width: 1440, height: 960 },
    locale: "pt-BR",
    args: ["--disable-blink-features=AutomationControlled"],
  });
  sharedContext.setDefaultTimeout(60_000);
  connectionMode = "playwright";
  return { context: sharedContext, downloadsDir, mode: connectionMode };
}

export async function closeBrowserContext(): Promise<void> {
  // Em DICloak/CDP não fechamos o navegador do usuário — só desconectamos.
  if (connectionMode === "dicloak" || connectionMode === "cdp") {
    try {
      await sharedBrowser?.close();
    } catch {
      /* already disconnected */
    }
    sharedBrowser = null;
    sharedContext = null;
    connectionMode = "playwright";
    return;
  }

  if (sharedContext) {
    await sharedContext.close();
    sharedContext = null;
  }
  sharedBrowser = null;
}

export async function openPage(
  url: string,
  opts?: { headless?: boolean },
): Promise<{ page: Page; downloadsDir: string }> {
  const { context, downloadsDir } = await getBrowserContext(opts);
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "domcontentloaded" });
  return { page, downloadsDir };
}

export function logJob(
  push: (line: string) => void,
  message: string,
): void {
  const stamp = new Date().toLocaleTimeString("pt-BR");
  push(`[${stamp}] ${message}`);
}
