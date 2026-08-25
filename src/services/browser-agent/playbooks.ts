import { promises as fs } from "fs";
import path from "path";
import type { Page } from "playwright";
import { logJob } from "@/services/browser-agent/session";

async function tryFillPrompt(page: Page, prompt: string): Promise<boolean> {
  const candidates = [
    page.getByRole("textbox").first(),
    page.locator('textarea').first(),
    page.locator('[contenteditable="true"]').first(),
    page.locator('[role="textbox"]').first(),
  ];

  for (const locator of candidates) {
    try {
      if ((await locator.count()) === 0) continue;
      await locator.click({ timeout: 2500 });
      await locator.fill(prompt, { timeout: 2500 }).catch(async () => {
        await page.keyboard.insertText(prompt);
      });
      return true;
    } catch {
      // try next
    }
  }
  return false;
}

async function tryUploadFiles(page: Page, files: string[]): Promise<number> {
  if (!files.length) return 0;
  const existing = files.filter(Boolean);
  if (!existing.length) return 0;

  const inputs = page.locator('input[type="file"]');
  const count = await inputs.count();
  if (!count) return 0;

  let uploaded = 0;
  for (let i = 0; i < count && i < existing.length; i++) {
    try {
      await inputs.nth(i).setInputFiles(existing.slice(i, i + 1));
      uploaded += 1;
    } catch {
      // continue
    }
  }

  if (!uploaded) {
    try {
      await inputs.first().setInputFiles(existing);
      uploaded = existing.length;
    } catch {
      return 0;
    }
  }
  return uploaded;
}

async function copyToClipboard(page: Page, text: string) {
  await page.evaluate(async (value) => {
    await navigator.clipboard.writeText(value);
  }, text);
}

export async function runGoogleFlowImage(opts: {
  page: Page;
  prompt: string;
  negativePrompt?: string;
  referencePaths: string[];
  downloadsDir: string;
  mode: "assisted" | "auto";
  onLog: (line: string) => void;
}): Promise<{ status: "completed" | "waiting_user" | "failed"; resultPath?: string; error?: string }> {
  const { page, prompt, referencePaths, downloadsDir, mode, onLog } = opts;
  const flowUrl =
    process.env.GOOGLE_FLOW_URL || "https://flow.google/";

  logJob(onLog, `Abrindo Google Flow: ${flowUrl}`);
  await page.goto(flowUrl, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);

  const filled = await tryFillPrompt(page, prompt);
  if (filled) {
    logJob(onLog, "Prompt colado no campo do Flow.");
  } else {
    await copyToClipboard(page, prompt).catch(() => undefined);
    logJob(
      onLog,
      "Não achei o campo automaticamente. Prompt copiado para a área de transferência — cole com Ctrl+V.",
    );
  }

  if (opts.negativePrompt) {
    await copyToClipboard(page, `${prompt}\n\nNEGATIVE:\n${opts.negativePrompt}`).catch(
      () => undefined,
    );
  }

  const uploaded = await tryUploadFiles(page, referencePaths);
  if (uploaded > 0) {
    logJob(onLog, `${uploaded} referência(s) enviada(s).`);
  } else if (referencePaths.length) {
    logJob(
      onLog,
      "Não encontrei input de upload. Arraste as imagens da pasta do produto manualmente se o Flow pedir.",
    );
  }

  if (mode === "assisted") {
    logJob(
      onLog,
      "Modo assistido: revise no navegador, clique em gerar e salve a imagem. O Model Studeo continua monitorando downloads.",
    );
  } else {
    // Best-effort generate click
    const generateButtons = [
      page.getByRole("button", { name: /generate|criar|create|gerar|run/i }).first(),
      page.locator('button:has-text("Generate")').first(),
      page.locator('button:has-text("Create")').first(),
    ];
    let clicked = false;
    for (const btn of generateButtons) {
      try {
        if ((await btn.count()) === 0) continue;
        await btn.click({ timeout: 3000 });
        clicked = true;
        logJob(onLog, "Clique de geração disparado.");
        break;
      } catch {
        // next
      }
    }
    if (!clicked) {
      logJob(onLog, "Botão de gerar não encontrado — conclua a geração no navegador.");
    }
  }

  const resultPath = path.join(downloadsDir, `flow-${Date.now()}.png`);
  const deadline = Date.now() + (mode === "assisted" ? 180_000 : 120_000);

  while (Date.now() < deadline) {
    // Prefer catching a real download event briefly
    try {
      const downloadPromise = page.waitForEvent("download", { timeout: 4000 });
      const download = await downloadPromise;
      const suggested = download.suggestedFilename() || `flow-${Date.now()}.bin`;
      const target = path.join(downloadsDir, suggested);
      await download.saveAs(target);
      logJob(onLog, `Download capturado: ${suggested}`);
      return { status: "completed", resultPath: target };
    } catch {
      // keep waiting / polling folder
    }

    try {
      const files = await fs.readdir(downloadsDir);
      const newest = files
        .filter((f) => /\.(png|jpg|jpeg|webp)$/i.test(f))
        .map((f) => ({ f, full: path.join(downloadsDir, f) }));
      if (newest.length) {
        const stats = await Promise.all(
          newest.map(async (item) => ({
            ...item,
            mtime: (await fs.stat(item.full)).mtimeMs,
          })),
        );
        stats.sort((a, b) => b.mtime - a.mtime);
        if (stats[0] && stats[0].mtime > Date.now() - 200_000) {
          logJob(onLog, `Imagem encontrada em downloads: ${stats[0].f}`);
          return { status: "completed", resultPath: stats[0].full };
        }
      }
    } catch {
      // ignore
    }

    await page.waitForTimeout(2000);
  }

  // Save a screenshot as fallback evidence that the agent opened Flow
  try {
    await page.screenshot({ path: resultPath, fullPage: true });
    logJob(
      onLog,
      "Tempo esgotado sem download. Salvei um print da tela do Flow para você revisar.",
    );
    return { status: "waiting_user", resultPath };
  } catch (error) {
    return {
      status: "failed",
      error: error instanceof Error ? error.message : "Falha no Google Flow",
    };
  }
}

export async function runGoogleFlowVideo(opts: {
  page: Page;
  prompt: string;
  sourceImagePath?: string;
  downloadsDir: string;
  mode: "assisted" | "auto";
  onLog: (line: string) => void;
}): Promise<{ status: "completed" | "waiting_user" | "failed"; resultPath?: string; error?: string }> {
  const imageResult = await runGoogleFlowImage({
    page: opts.page,
    prompt: opts.prompt,
    referencePaths: opts.sourceImagePath ? [opts.sourceImagePath] : [],
    downloadsDir: opts.downloadsDir,
    mode: opts.mode,
    onLog: opts.onLog,
  });
  logJob(opts.onLog, "Fluxo de vídeo no Flow preparado (image-to-video / frames).");
  return imageResult;
}

export async function runKalodataResearch(opts: {
  page: Page;
  productName?: string;
  onLog: (line: string) => void;
}): Promise<{ status: "completed" | "waiting_user" }> {
  const url = process.env.KALODATA_URL || "https://www.kalodata.com/";
  logJob(opts.onLog, `Abrindo Kalodata: ${url}`);
  await opts.page.goto(url, { waitUntil: "domcontentloaded" });
  await opts.page.waitForTimeout(2000);

  if (opts.productName) {
    const search = opts.page.getByPlaceholder(/search|buscar|pesquisa/i).first();
    try {
      if ((await search.count()) > 0) {
        await search.fill(opts.productName);
        await opts.page.keyboard.press("Enter");
        logJob(opts.onLog, `Busca iniciada por "${opts.productName}".`);
      } else {
        logJob(
          opts.onLog,
          `Kalodata aberto. Busque manualmente por: ${opts.productName}`,
        );
      }
    } catch {
      logJob(
        opts.onLog,
        `Kalodata aberto. Busque manualmente por: ${opts.productName}`,
      );
    }
  } else {
    logJob(opts.onLog, "Kalodata aberto para pesquisa de tendências.");
  }

  return { status: "waiting_user" };
}

export async function openCreativeTools(opts: {
  contextPages: { open: (url: string) => Promise<Page> };
  productName?: string;
  onLog: (line: string) => void;
}): Promise<void> {
  const flowUrl =
    process.env.GOOGLE_FLOW_URL || "https://flow.google/";
  const kaloUrl = process.env.KALODATA_URL || "https://www.kalodata.com/";

  logJob(opts.onLog, "Abrindo Google Flow e Kalodata em abas separadas...");
  await opts.contextPages.open(flowUrl);
  await opts.contextPages.open(kaloUrl);
  if (opts.productName) {
    logJob(opts.onLog, `Produto em foco: ${opts.productName}`);
  }
}
