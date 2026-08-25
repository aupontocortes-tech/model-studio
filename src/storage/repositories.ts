import type {
  Character,
  Generation,
  Product,
  Project,
  ReferenceImage,
} from "@/domain/types";
import { readJsonFile, writeJsonFile } from "@/storage/fs";

type Collection<T> = T[];

async function list<T>(file: string): Promise<Collection<T>> {
  return readJsonFile<Collection<T>>(file, []);
}

async function save<T>(file: string, items: Collection<T>): Promise<void> {
  await writeJsonFile(file, items);
}

export const productRepo = {
  async all(): Promise<Product[]> {
    return list<Product>("products.json");
  },
  async get(id: string): Promise<Product | undefined> {
    return (await this.all()).find((p) => p.id === id);
  },
  async upsert(product: Product): Promise<Product> {
    const items = await this.all();
    const idx = items.findIndex((p) => p.id === product.id);
    if (idx >= 0) items[idx] = product;
    else items.push(product);
    await save("products.json", items);
    return product;
  },
  async remove(id: string): Promise<void> {
    await save(
      "products.json",
      (await this.all()).filter((p) => p.id !== id),
    );
  },
};

export const characterRepo = {
  async all(): Promise<Character[]> {
    return list<Character>("characters.json");
  },
  async get(id: string): Promise<Character | undefined> {
    return (await this.all()).find((c) => c.id === id);
  },
  async upsert(character: Character): Promise<Character> {
    const items = await this.all();
    const idx = items.findIndex((c) => c.id === character.id);
    if (idx >= 0) items[idx] = character;
    else items.push(character);
    await save("characters.json", items);
    return character;
  },
  async remove(id: string): Promise<void> {
    await save(
      "characters.json",
      (await this.all()).filter((c) => c.id !== id),
    );
  },
};

export const projectRepo = {
  async all(): Promise<Project[]> {
    return list<Project>("projects.json");
  },
  async get(id: string): Promise<Project | undefined> {
    return (await this.all()).find((p) => p.id === id);
  },
  async upsert(project: Project): Promise<Project> {
    const items = await this.all();
    const idx = items.findIndex((p) => p.id === project.id);
    if (idx >= 0) items[idx] = project;
    else items.push(project);
    await save("projects.json", items);
    return project;
  },
  async remove(id: string): Promise<void> {
    await save(
      "projects.json",
      (await this.all()).filter((p) => p.id !== id),
    );
  },
};

export const generationRepo = {
  async all(): Promise<Generation[]> {
    return list<Generation>("generations.json");
  },
  async get(id: string): Promise<Generation | undefined> {
    return (await this.all()).find((g) => g.id === id);
  },
  async upsert(generation: Generation): Promise<Generation> {
    const items = await this.all();
    const idx = items.findIndex((g) => g.id === generation.id);
    if (idx >= 0) items[idx] = generation;
    else items.push(generation);
    await save("generations.json", items);
    return generation;
  },
};

export const referenceRepo = {
  async all(): Promise<ReferenceImage[]> {
    return list<ReferenceImage>("references.json");
  },
  async upsert(ref: ReferenceImage): Promise<ReferenceImage> {
    const items = await this.all();
    const idx = items.findIndex((r) => r.id === ref.id);
    if (idx >= 0) items[idx] = ref;
    else items.push(ref);
    await save("references.json", items);
    return ref;
  },
};
