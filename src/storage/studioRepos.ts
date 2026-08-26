import type {
  SavedStudioPrompt,
  StudioCharacter,
  StudioMovement,
  StudioOutfit,
  StudioScene,
  StudioScript,
} from "@/domain/studioAssets";
import { readJsonFile, writeJsonFile } from "@/storage/fs";

type Collection<T> = T[];

const fileLocks = new Map<string, Promise<unknown>>();

async function withFileLock<T>(file: string, fn: () => Promise<T>): Promise<T> {
  const prev = fileLocks.get(file) ?? Promise.resolve();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  fileLocks.set(
    file,
    prev.then(
      () => gate,
      () => gate,
    ),
  );
  await prev.catch(() => undefined);
  try {
    return await fn();
  } finally {
    release();
  }
}

function makeRepo<T extends { id: string }>(file: string) {
  return {
    async all(): Promise<T[]> {
      return withFileLock(file, () => readJsonFile<Collection<T>>(file, []));
    },
    async get(id: string): Promise<T | undefined> {
      return (await this.all()).find((x) => x.id === id);
    },
    async upsert(item: T): Promise<T> {
      return withFileLock(file, async () => {
        const items = await readJsonFile<Collection<T>>(file, []);
        const idx = items.findIndex((x) => x.id === item.id);
        if (idx >= 0) items[idx] = item;
        else items.push(item);
        await writeJsonFile(file, items);
        return item;
      });
    },
    async remove(id: string): Promise<void> {
      await withFileLock(file, async () => {
        const items = await readJsonFile<Collection<T>>(file, []);
        await writeJsonFile(
          file,
          items.filter((x) => x.id !== id),
        );
      });
    },
  };
}

export const studioCharacterRepo = makeRepo<StudioCharacter>(
  "studio-characters.json",
);
export const studioOutfitRepo = makeRepo<StudioOutfit>("studio-outfits.json");
export const studioSceneRepo = makeRepo<StudioScene>("studio-scenes.json");
export const studioMovementRepo = makeRepo<StudioMovement>(
  "studio-movements.json",
);
export const studioScriptRepo = makeRepo<StudioScript>("studio-scripts.json");
export const savedStudioPromptRepo = makeRepo<SavedStudioPrompt>(
  "studio-saved-prompts.json",
);
