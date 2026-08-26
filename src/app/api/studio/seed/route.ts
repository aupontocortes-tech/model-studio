import {
  emptyStudioCharacter,
  type StudioCharacter,
} from "@/domain/studioAssets";
import { jsonOk, createId, nowIso } from "@/lib/studioCrud";
import { projectRepo } from "@/storage/repositories";
import {
  studioCharacterRepo,
  studioOutfitRepo,
  studioSceneRepo,
} from "@/storage/studioRepos";

export async function POST() {
  const now = nowIso();
  const projectId = createId("proj");

  await projectRepo.upsert({
    id: projectId,
    name: "Lia • TikTok",
    description: "Seed — banco da personagem + bibliotecas + criação",
    productIds: [],
    characterIds: [],
    generationIds: [],
    createdAt: now,
    updatedAt: now,
  });

  const outfitId = createId("outfit");
  await studioOutfitRepo.upsert({
    id: outfitId,
    projectId,
    name: "Blazer azul-marinho",
    description: "blazer azul-marinho estruturado sobre top simples",
    colors: "azul-marinho",
    createdAt: now,
    updatedAt: now,
  });

  const sceneId = createId("scene");
  await studioSceneRepo.upsert({
    id: sceneId,
    projectId,
    name: "Café",
    description:
      "cafeteria aconchegante, mesa de madeira, luz natural na janela, fundo levemente desfocado",
    lighting: "luz natural de janela",
    createdAt: now,
    updatedAt: now,
  });

  const base = emptyStudioCharacter(createId("stchar"), now, "Lia Mendes");
  const character: StudioCharacter = {
    ...base,
    projectId,
    identity: {
      ...base.identity,
      displayName: "Lia Mendes",
      identityPrompt: `Lia Mendes, 24 anos.
Rosto oval delicado, sobrancelhas naturais, lábios médios.
Cabelo castanho ondulado até os ombros.
Olhos castanho-claro amendoados.
Pele morena clara.
Nunca alterar o rosto.`,
    },
    bodyDetails: "slim-atlético, ombros suaves, proporções naturais UGC",
    bodyPrompt:
      "corpo slim-atlético, postura natural de criadora, proporções realistas, mesma Lia em todas as cenas",
    outfitIds: [outfitId],
    sceneIds: [sceneId],
    movements: [
      {
        id: createId("cmove"),
        name: "Caminhando para câmera",
        prompt:
          "caminha em direção à câmera, para perto e fala olhando no lente; handheld 9:16",
      },
    ],
    voice: {
      name: "Lia — grave suave",
      prompt:
        "voz feminina jovem, tom médio-grave, ritmo calmo de conversa, português brasileiro natural",
    },
  };
  await studioCharacterRepo.upsert(character);

  return jsonOk({
    projectId,
    character,
    message: "Lia criada com roupa, cenário, movimento e voz. Abra Biblioteca ou Criar.",
  });
}
