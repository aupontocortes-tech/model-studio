import type {
  Character,
  Generation,
  Product,
  Project,
} from "@/domain/types";

async function parse<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Falha na requisição");
  return data as T;
}

export const api = {
  meta: () =>
    fetch("/api/meta").then((r) =>
      parse<{
        provider: string;
        browserAgentMode: string;
        browserTarget?: "dicloak" | "cdp" | "playwright";
        googleFlowUrl: string;
        kalodataUrl: string;
        maxUploadBytes: number;
        dicloak?: {
          configured: boolean;
          apiUrl: string;
          profileId: string | null;
          profileSerial: string | null;
          apiKeyConfigured: boolean;
          probe: { ok: boolean; message: string; baseUrl: string } | null;
        };
        browserCdpUrlConfigured?: boolean;
        scenePresets: Array<{ id: string; name: string; description: string }>;
        videoStyles: string[];
        ctaOptions: string[];
      }>(r),
    ),
  agent: {
    list: () =>
      fetch("/api/agent").then((r) =>
        parse<{
          jobs: Array<{
            id: string;
            kind: string;
            status: string;
            logs: string[];
            resultImageUrl?: string;
            error?: string;
          }>;
        }>(r),
      ),
    start: (body: Record<string, unknown>) =>
      fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then((r) =>
        parse<{
          job: {
            id: string;
            kind: string;
            status: string;
            logs: string[];
          };
        }>(r),
      ),
    get: (id: string) =>
      fetch(`/api/agent/${id}`).then((r) =>
        parse<{
          job: {
            id: string;
            kind: string;
            status: string;
            logs: string[];
            resultImageUrl?: string;
            error?: string;
          };
        }>(r),
      ),
  },
  projects: {
    list: () => fetch("/api/projects").then((r) => parse<{ projects: Project[] }>(r)),
    create: (body: { name: string; description?: string }) =>
      fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then((r) => parse<{ project: Project }>(r)),
  },
  products: {
    list: () => fetch("/api/products").then((r) => parse<{ products: Product[] }>(r)),
    create: (body: {
      name: string;
      category?: string;
      commercialInfo?: string;
      projectId?: string;
    }) =>
      fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then((r) => parse<{ product: Product }>(r)),
    update: (id: string, body: Partial<Product>) =>
      fetch(`/api/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then((r) => parse<{ product: Product }>(r)),
    analyze: (id: string) =>
      fetch(`/api/products/${id}/analyze`, { method: "POST" }).then((r) =>
        parse<{ product: Product }>(r),
      ),
    upload: async (id: string, file: File, label: string) => {
      const form = new FormData();
      form.append("file", file);
      form.append("label", label);
      form.append("role", "PRODUCT_REFERENCE");
      return fetch(`/api/products/${id}/upload`, {
        method: "POST",
        body: form,
      }).then((r) => parse<{ product: Product }>(r));
    },
    reorder: (id: string, orderedIds: string[]) =>
      fetch(`/api/products/${id}/references`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds }),
      }).then((r) => parse<{ product: Product }>(r)),
  },
  characters: {
    list: () =>
      fetch("/api/characters").then((r) => parse<{ characters: Character[] }>(r)),
    create: (body: Record<string, unknown>) =>
      fetch("/api/characters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then((r) => parse<{ character: Character }>(r)),
    update: (id: string, body: Record<string, unknown>) =>
      fetch(`/api/characters/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then((r) => parse<{ character: Character }>(r)),
    upload: async (id: string, file: File) => {
      const form = new FormData();
      form.append("file", file);
      return fetch(`/api/characters/${id}/upload`, {
        method: "POST",
        body: form,
      }).then((r) => parse<{ character: Character }>(r));
    },
  },
  referenceVideos: {
    upload: async (file: File) => {
      const form = new FormData();
      form.append("file", file);
      return fetch("/api/reference-videos", {
        method: "POST",
        body: form,
      }).then((r) =>
        parse<{
          referenceVideo: {
            url: string;
            filename: string;
            mimeType: string;
            sizeBytes: number;
          };
        }>(r),
      );
    },
  },
  generations: {
    list: () =>
      fetch("/api/generations").then((r) =>
        parse<{ generations: Generation[] }>(r),
      ),
    create: (body: Record<string, unknown>) =>
      fetch("/api/generations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then((r) => parse<{ generations: Generation[] }>(r)),
    patch: (id: string, body: Record<string, unknown>) =>
      fetch(`/api/generations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then((r) => parse<{ generation: Generation }>(r)),
  },
    claudeBrief: (opts?: { generationId?: string; mode?: "pack" | "prompt" }) => {
    const q = new URLSearchParams();
    if (opts?.generationId) q.set("generationId", opts.generationId);
    if (opts?.mode) q.set("mode", opts.mode);
    const suffix = q.toString() ? `?${q}` : "";
    return fetch(`/api/claude-brief${suffix}`).then((r) =>
      parse<{
        kind: string;
        ready?: boolean;
        prompt?: string;
        systemPrompt?: string;
        markdown?: string;
        fullBriefing?: string;
        howToUse?: string;
        pack?: Record<string, unknown>;
      }>(r),
    );
  },
  studio: {
    characters: {
      list: () =>
        fetch("/api/studio/characters").then((r) =>
          parse<{ characters: import("@/domain/studioAssets").StudioCharacter[] }>(r),
        ),
      create: (body: Record<string, unknown>) =>
        fetch("/api/studio/characters", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }).then((r) =>
          parse<{ character: import("@/domain/studioAssets").StudioCharacter }>(r),
        ),
      update: (id: string, body: Record<string, unknown>) =>
        fetch(`/api/studio/characters/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }).then((r) =>
          parse<{ character: import("@/domain/studioAssets").StudioCharacter }>(r),
        ),
      remove: (id: string) =>
        fetch(`/api/studio/characters/${id}`, { method: "DELETE" }).then((r) =>
          parse<{ ok: boolean }>(r),
        ),
      get: (id: string) =>
        fetch(`/api/studio/characters/${id}`).then((r) =>
          parse<{ character: import("@/domain/studioAssets").StudioCharacter }>(
            r,
          ),
        ),
    },
    outfits: {
      list: () =>
        fetch("/api/studio/outfits").then((r) =>
          parse<{ outfits: import("@/domain/studioAssets").StudioOutfit[] }>(r),
        ),
      create: (body: Record<string, unknown>) =>
        fetch("/api/studio/outfits", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }).then((r) =>
          parse<{ outfit: import("@/domain/studioAssets").StudioOutfit }>(r),
        ),
      update: (id: string, body: Record<string, unknown>) =>
        fetch(`/api/studio/outfits/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }).then((r) =>
          parse<{ outfit: import("@/domain/studioAssets").StudioOutfit }>(r),
        ),
      remove: (id: string) =>
        fetch(`/api/studio/outfits/${id}`, { method: "DELETE" }).then((r) =>
          parse<{ ok: boolean }>(r),
        ),
      upload: async (file: File, opts?: { outfitId?: string; characterId?: string; name?: string; description?: string; slot?: "piece" | "worn" }) => {
        const form = new FormData();
        form.append("file", file);
        if (opts?.outfitId) form.append("outfitId", opts.outfitId);
        if (opts?.characterId) form.append("characterId", opts.characterId);
        if (opts?.name) form.append("name", opts.name);
        if (opts?.description) form.append("description", opts.description);
        form.append("slot", opts?.slot || "piece");
        return fetch("/api/studio/outfits/upload", {
          method: "POST",
          body: form,
        }).then((r) =>
          parse<{ outfit: import("@/domain/studioAssets").StudioOutfit; url: string }>(r),
        );
      },
    },
    scenes: {
      list: () =>
        fetch("/api/studio/scenes").then((r) =>
          parse<{ scenes: import("@/domain/studioAssets").StudioScene[] }>(r),
        ),
      create: (body: Record<string, unknown>) =>
        fetch("/api/studio/scenes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }).then((r) =>
          parse<{ scene: import("@/domain/studioAssets").StudioScene }>(r),
        ),
      update: (id: string, body: Record<string, unknown>) =>
        fetch(`/api/studio/scenes/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }).then((r) =>
          parse<{ scene: import("@/domain/studioAssets").StudioScene }>(r),
        ),
      remove: (id: string) =>
        fetch(`/api/studio/scenes/${id}`, { method: "DELETE" }).then((r) =>
          parse<{ ok: boolean }>(r),
        ),
      upload: async (
        file: File,
        opts?: {
          sceneId?: string;
          characterId?: string;
          name?: string;
          description?: string;
          slot?: "place" | "inScene";
        },
      ) => {
        const form = new FormData();
        form.append("file", file);
        if (opts?.sceneId) form.append("sceneId", opts.sceneId);
        if (opts?.characterId) form.append("characterId", opts.characterId);
        if (opts?.name) form.append("name", opts.name);
        if (opts?.description) form.append("description", opts.description);
        form.append("slot", opts?.slot || "place");
        return fetch("/api/studio/scenes/upload", {
          method: "POST",
          body: form,
        }).then((r) =>
          parse<{ scene: import("@/domain/studioAssets").StudioScene; url: string }>(
            r,
          ),
        );
      },
    },
    movements: {
      list: () =>
        fetch("/api/studio/movements").then((r) =>
          parse<{ movements: import("@/domain/studioAssets").StudioMovement[] }>(
            r,
          ),
        ),
      create: (body: Record<string, unknown>) =>
        fetch("/api/studio/movements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }).then((r) =>
          parse<{ movement: import("@/domain/studioAssets").StudioMovement }>(r),
        ),
      remove: (id: string) =>
        fetch(`/api/studio/movements/${id}`, { method: "DELETE" }).then((r) =>
          parse<{ ok: boolean }>(r),
        ),
    },
    scripts: {
      list: () =>
        fetch("/api/studio/scripts").then((r) =>
          parse<{ scripts: import("@/domain/studioAssets").StudioScript[] }>(r),
        ),
      create: (body: Record<string, unknown>) =>
        fetch("/api/studio/scripts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }).then((r) =>
          parse<{ script: import("@/domain/studioAssets").StudioScript }>(r),
        ),
      remove: (id: string) =>
        fetch(`/api/studio/scripts/${id}`, { method: "DELETE" }).then((r) =>
          parse<{ ok: boolean }>(r),
        ),
    },
    prompts: {
      list: () =>
        fetch("/api/studio/generate-prompt").then((r) =>
          parse<{ prompts: import("@/domain/studioAssets").SavedStudioPrompt[] }>(
            r,
          ),
        ),
      generate: (body: Record<string, unknown>) =>
        fetch("/api/studio/generate-prompt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }).then((r) =>
          parse<{
            systemPrompt: string;
            userPrompt: string;
            fullPrompt: string;
            characterId?: string;
            saved?: import("@/domain/studioAssets").SavedStudioPrompt;
            characterPreview: Record<string, string | undefined>;
          }>(r),
        ),
    },
    seed: () =>
      fetch("/api/studio/seed", { method: "POST" }).then((r) =>
        parse<{ message: string; projectId: string }>(r),
      ),
  },
};
