import { jsonError, jsonOk } from "@/lib/api";
import { createId } from "@/lib/ids";
import {
  isNeonEnabled,
  neonReadCollection,
  neonSaveFile,
  neonWriteCollection,
} from "@/db/neon";
import type {
  StudioCharacter,
  StudioOutfit,
  StudioScene,
} from "@/domain/studioAssets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function parseDataUrl(
  url: string,
): { buffer: Buffer; contentType: string; ext: string } | null {
  const m = /^data:([\w/+.-]+);base64,([\s\S]*)$/.exec(url);
  if (!m) return null;
  const contentType = m[1];
  const buffer = Buffer.from(m[2], "base64");
  const rawExt = contentType.split("/")[1]?.split("+")[0] || "jpg";
  const ext = rawExt === "jpeg" ? "jpg" : rawExt;
  return { buffer, contentType, ext };
}

/**
 * Move fotos antigas que ficaram embutidas como data URL (base64) dentro
 * dos registros para a tabela de arquivos (studio_files), trocando o campo
 * pela URL /api/studio/files/... — mesma foto, mesma qualidade, só que o
 * registro (roupa/personagem/cenário) fica leve.
 */
async function migrateField(
  relativeDirBase: string,
  label: string,
  value: string | undefined,
): Promise<{ url: string | undefined; migrated: boolean; bytes: number }> {
  if (!value || !value.startsWith("data:")) {
    return { url: value, migrated: false, bytes: 0 };
  }
  const parsed = parseDataUrl(value);
  if (!parsed) return { url: value, migrated: false, bytes: 0 };
  const relativePath = `${relativeDirBase}/${label}-${createId("mig")}.${parsed.ext}`;
  await neonSaveFile({
    relativePath,
    buffer: parsed.buffer,
    contentType: parsed.contentType,
  });
  return {
    url: `/api/studio/files/${relativePath}`,
    migrated: true,
    bytes: parsed.buffer.length,
  };
}

export async function POST(request: Request) {
  if (!isNeonEnabled()) {
    return jsonError(
      "DATABASE_URL não configurada — nada para migrar (este servidor já usa JSON local, sem base64 embutido em produção).",
      400,
    );
  }
  const url = new URL(request.url);
  if (url.searchParams.get("confirm") !== "yes") {
    return jsonError("Confirme com ?confirm=yes para rodar a migração.", 400);
  }

  const summary = {
    outfits: 0,
    characters: 0,
    scenes: 0,
    bytesMoved: 0,
  };

  // Roupas: peça + ela vestida
  {
    const items = await neonReadCollection<StudioOutfit>("studio-outfits.json");
    let changed = false;
    for (const item of items) {
      const piece = await migrateField(`studio-outfits/${item.id}`, "peca", item.imageUrl);
      if (piece.migrated) {
        item.imageUrl = piece.url;
        summary.outfits += 1;
        summary.bytesMoved += piece.bytes;
        changed = true;
      }
      const worn = await migrateField(`studio-outfits/${item.id}`, "vestida", item.wornImageUrl);
      if (worn.migrated) {
        item.wornImageUrl = worn.url;
        summary.outfits += 1;
        summary.bytesMoved += worn.bytes;
        changed = true;
      }
    }
    if (changed) await neonWriteCollection("studio-outfits.json", items);
  }

  // Personagens: rosto + corpo
  {
    const items = await neonReadCollection<StudioCharacter>("studio-characters.json");
    let changed = false;
    for (const item of items) {
      const face = await migrateField(`studio-characters/${item.id}`, "rosto", item.faceImageUrl);
      if (face.migrated) {
        item.faceImageUrl = face.url;
        summary.characters += 1;
        summary.bytesMoved += face.bytes;
        changed = true;
      }
      const body = await migrateField(`studio-characters/${item.id}`, "corpo", item.bodyImageUrl);
      if (body.migrated) {
        item.bodyImageUrl = body.url;
        summary.characters += 1;
        summary.bytesMoved += body.bytes;
        changed = true;
      }
      if (item.primaryImageUrl?.startsWith("data:")) {
        item.primaryImageUrl = item.faceImageUrl || undefined;
        changed = true;
      }
    }
    if (changed) await neonWriteCollection("studio-characters.json", items);
  }

  // Cenários: lugar + ela no cenário
  {
    const items = await neonReadCollection<StudioScene>("studio-scenes.json");
    let changed = false;
    for (const item of items) {
      const place = await migrateField(`studio-scenes/${item.id}`, "lugar", item.imageUrl);
      if (place.migrated) {
        item.imageUrl = place.url;
        summary.scenes += 1;
        summary.bytesMoved += place.bytes;
        changed = true;
      }
      const inScene = await migrateField(`studio-scenes/${item.id}`, "nocenario", item.inSceneImageUrl);
      if (inScene.migrated) {
        item.inSceneImageUrl = inScene.url;
        summary.scenes += 1;
        summary.bytesMoved += inScene.bytes;
        changed = true;
      }
    }
    if (changed) await neonWriteCollection("studio-scenes.json", items);
  }

  return jsonOk({ ok: true, migrated: summary });
}
