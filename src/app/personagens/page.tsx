"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Field,
  PageHeader,
  Panel,
  inputClass,
} from "@/components/ui/primitives";
import { LibraryTabs } from "@/components/studio/LibraryTabs";
import { OutfitCard } from "@/components/studio/OutfitCard";
import { SceneCard } from "@/components/studio/SceneCard";
import { FilePickButton, PhotoPickSlot } from "@/components/studio/FilePickButton";
import { api } from "@/lib/clientApi";
import { prepareImageFile } from "@/lib/prepareImage";
import { OutfitWornGalleryDialog } from "@/components/studio/OutfitWornGalleryDialog";
import {
  characterHasVoice,
  outfitLabel,
  sceneLabel,
  type StudioCharacter,
  type StudioOutfit,
  type StudioScene,
  type WornPhotoRef,
} from "@/domain/studioAssets";
import { Plus, Trash2, Upload } from "lucide-react";

export default function BibliotecaPersonagensPage() {
  const [list, setList] = useState<StudioCharacter[]>([]);
  const [outfits, setOutfits] = useState<StudioOutfit[]>([]);
  const [scenes, setScenes] = useState<StudioScene[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [storageWarning, setStorageWarning] = useState("");
  const voiceRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [identityPrompt, setIdentityPrompt] = useState("");
  const [bodyDetails, setBodyDetails] = useState("");
  const [bodyPrompt, setBodyPrompt] = useState("");
  const [voiceName, setVoiceName] = useState("");
  const [voicePrompt, setVoicePrompt] = useState("");
  const [voiceNotes, setVoiceNotes] = useState("");

  const [moveName, setMoveName] = useState("");
  const [movePrompt, setMovePrompt] = useState("");
  const [newOutfitName, setNewOutfitName] = useState("");
  const [newOutfitPrompt, setNewOutfitPrompt] = useState("");
  const [copyOutfitId, setCopyOutfitId] = useState("");
  const [copyTargetId, setCopyTargetId] = useState("");
  const [editOutfitName, setEditOutfitName] = useState("");
  const [selectedSceneId, setSelectedSceneId] = useState("");
  const [editSceneName, setEditSceneName] = useState("");
  const [newSceneName, setNewSceneName] = useState("");
  const [newScenePrompt, setNewScenePrompt] = useState("");
  const [dragOutfitId, setDragOutfitId] = useState<string | null>(null);
  const [dragOverOutfitId, setDragOverOutfitId] = useState<string | null>(null);
  const [galleryOutfitId, setGalleryOutfitId] = useState<string | null>(null);

  const selected = list.find((c) => c.id === selectedId);
  const others = list.filter((c) => c.id !== selectedId);

  const wardrobe = useMemo(() => {
    if (!selected) return [];
    const byId = new Map(outfits.map((o) => [o.id, o]));
    return selected.outfitIds
      .map((id) => byId.get(id))
      .filter((o): o is StudioOutfit => Boolean(o));
  }, [outfits, selected]);
  const availableOutfits = useMemo(
    () => outfits.filter((o) => !selected?.outfitIds.includes(o.id)),
    [outfits, selected],
  );
  const selectedLook = wardrobe.find((o) => o.id === copyOutfitId);
  const galleryOutfit = outfits.find((o) => o.id === galleryOutfitId);
  const pinnedScenes = useMemo(
    () => scenes.filter((s) => selected?.sceneIds.includes(s.id)),
    [scenes, selected],
  );
  const availableScenes = useMemo(
    () => scenes.filter((s) => !selected?.sceneIds.includes(s.id)),
    [scenes, selected],
  );
  const selectedScene = pinnedScenes.find((s) => s.id === selectedSceneId);

  const reload = useCallback(async () => {
    const [cRes, oRes, sRes] = await Promise.allSettled([
      api.studio.characters.list(),
      api.studio.outfits.list(),
      api.studio.scenes.list(),
    ]);
    if (cRes.status !== "fulfilled") throw cRes.reason;
    const listed = cRes.value as {
      characters: StudioCharacter[];
      storageWarning?: string;
    };
    if (listed.storageWarning) setStorageWarning(listed.storageWarning);
    setList((prev) =>
      listed.characters.map((incoming) => {
        const old = prev.find((p) => p.id === incoming.id);
        return {
          ...incoming,
          faceImageUrl: incoming.faceImageUrl || old?.faceImageUrl,
          bodyImageUrl: incoming.bodyImageUrl || old?.bodyImageUrl,
        };
      }),
    );
    if (oRes.status === "fulfilled") {
      setOutfits((prev) =>
        oRes.value.outfits.map((incoming) => {
          const old = prev.find((p) => p.id === incoming.id);
          return {
            ...incoming,
            imageUrl: incoming.imageUrl || old?.imageUrl,
            wornImageUrl: incoming.wornImageUrl || old?.wornImageUrl,
            wornGallery: incoming.wornGallery?.length
              ? incoming.wornGallery
              : old?.wornGallery,
          };
        }),
      );
    }
    if (sRes.status === "fulfilled") {
      setScenes((prev) =>
        sRes.value.scenes.map((incoming) => {
          const old = prev.find((p) => p.id === incoming.id);
          return {
            ...incoming,
            imageUrl: incoming.imageUrl || old?.imageUrl,
            inSceneImageUrl: incoming.inSceneImageUrl || old?.inSceneImageUrl,
          };
        }),
      );
    }
    if (!selectedId && listed.characters[0]) {
      setSelectedId(listed.characters[0].id);
    }
  }, [selectedId]);

  useEffect(() => {
    void reload().catch((e) =>
      setError(e instanceof Error ? e.message : "Erro"),
    );
  }, [reload]);

  useEffect(() => {
    void fetch("/api/meta")
      .then((r) => r.json())
      .then((data) => {
        const db = data?.database as
          | { mode?: string; message?: string; ping?: { ok?: boolean } }
          | undefined;
        if (!db) return;
        if (db.mode === "local-json") {
          setStorageWarning(
            db.message ||
              "Persistência temporária: configure DATABASE_URL (Neon) na Vercel, senão personagem e foto somem.",
          );
        } else if (db.ping && db.ping.ok === false) {
          setStorageWarning(
            `Neon não conecta: ${db.message || "confira DATABASE_URL e Redeploy."}`,
          );
        } else {
          setStorageWarning("");
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const current = list.find((c) => c.id === selectedId);
    if (!current) return;
    setName(current.identity.displayName);
    setIdentityPrompt(current.identity.identityPrompt || "");
    setBodyDetails(current.bodyDetails || "");
    setBodyPrompt(current.bodyPrompt || "");
    setVoiceName(current.voice?.name || "");
    setVoicePrompt(current.voice?.prompt || "");
    setVoiceNotes(current.voice?.notes || "");
  }, [selectedId, list]);

  useEffect(() => {
    const look = outfits.find((o) => o.id === copyOutfitId);
    setEditOutfitName(look?.name || "");
  }, [copyOutfitId, outfits]);

  useEffect(() => {
    const scene = scenes.find((s) => s.id === selectedSceneId);
    setEditSceneName(scene?.name || "");
  }, [selectedSceneId, scenes]);

  async function run(
    action: () => Promise<void>,
    ok?: string,
    opts?: { skipReload?: boolean },
  ) {
    setBusy(true);
    setError("");
    try {
      await action();
      if (!opts?.skipReload) await reload();
      if (ok) setMsg(ok);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha");
    } finally {
      setBusy(false);
    }
  }

  async function createNew() {
    await run(async () => {
      const { character } = await api.studio.characters.create({
        displayName: "Nova personagem",
      });
      setSelectedId(character.id);
    }, "Personagem criada — preencha o banco ao lado.");
  }

  async function saveCore() {
    if (!selectedId) return;
    await run(async () => {
      await api.studio.characters.update(selectedId, {
        displayName: name,
        identityPrompt,
        bodyDetails,
        bodyPrompt,
      });
    }, "Identidade e corpo salvos.");
  }

  async function saveVoice() {
    if (!selectedId) return;
    await run(async () => {
      await api.studio.characters.update(selectedId, {
        voice: { name: voiceName, prompt: voicePrompt, notes: voiceNotes },
      });
    }, "Voz salva.");
  }

  async function upload(kind: "face" | "body" | "voice", file: File) {
    if (!selectedId) {
      setError("Escolha ou crie uma personagem antes de enviar a foto.");
      return;
    }
    setBusy(true);
    setError("");
    setMsg(kind === "voice" ? "Enviando áudio…" : "Preparando foto…");
    try {
      const prepared =
        kind === "voice" ? file : await prepareImageFile(file);
      const preview =
        kind === "face" || kind === "body"
          ? URL.createObjectURL(prepared)
          : "";
      if (preview) {
        setList((prev) =>
          prev.map((c) =>
            c.id === selectedId
              ? kind === "face"
                ? { ...c, faceImageUrl: preview }
                : { ...c, bodyImageUrl: preview }
              : c,
          ),
        );
      }
      setMsg("Enviando…");
      const fd = new FormData();
      fd.set("file", prepared);
      fd.set("kind", kind);
      fd.set("displayName", name || selected?.identity.displayName || "");
      fd.set("identityPrompt", identityPrompt || selected?.identity.identityPrompt || "");
      const res = await fetch(`/api/studio/characters/${selectedId}/upload`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          (data as { error?: string }).error || `Upload falhou (${res.status})`,
        );
      }
      const character = (data as { character?: StudioCharacter }).character;
      if (character) {
        setList((prev) =>
          prev.map((c) =>
            c.id === character.id
              ? {
                  ...character,
                  faceImageUrl:
                    character.faceImageUrl ||
                    (kind === "face" ? preview : "") ||
                    c.faceImageUrl,
                  bodyImageUrl:
                    character.bodyImageUrl ||
                    (kind === "body" ? preview : "") ||
                    c.bodyImageUrl,
                }
              : c,
          ),
        );
      }
      setError("");
      setMsg(
        kind === "face"
          ? "Foto do rosto ok."
          : kind === "body"
            ? "Foto do corpo ok."
            : "Áudio da voz ok.",
      );
    } catch (e) {
      setMsg("");
      setError(e instanceof Error ? e.message : "Falha no envio da foto.");
    } finally {
      setBusy(false);
    }
  }

  async function addMovement() {
    if (!selectedId || !movePrompt.trim()) return;
    await run(async () => {
      await api.studio.characters.update(selectedId, {
        addMovement: { name: moveName || "Movimento", prompt: movePrompt },
      });
      setMoveName("");
      setMovePrompt("");
    }, "Movimento adicionado.");
  }

  async function attachOutfit(outfitId: string) {
    if (!selectedId || !outfitId) return;
    await run(async () => {
      await api.studio.characters.update(selectedId, { addOutfitId: outfitId });
    }, "Roupa no guarda-roupa.");
  }

  async function createAndAttachOutfit() {
    if (!selectedId) return;
    if (!newOutfitPrompt.trim() && !newOutfitName.trim()) return;
    await run(async () => {
      const { outfit } = await api.studio.outfits.create({
        name: newOutfitName.trim(),
        description: newOutfitPrompt.trim(),
      });
      await api.studio.characters.update(selectedId, { addOutfitId: outfit.id });
      setNewOutfitName("");
      setNewOutfitPrompt("");
      setCopyOutfitId(outfit.id);
    }, "Roupa criada e adicionada a ela.");
  }

  async function uploadOutfitPhoto(
    file: File,
    opts?: { replaceId?: string; slot?: "piece" | "worn" },
  ) {
    if (!selectedId) return;
    const slot = opts?.slot || "piece";
    const replaceId = opts?.replaceId;
    await run(async () => {
      const prepared = await prepareImageFile(file);
      const { outfit } = await api.studio.outfits.upload(prepared, {
        outfitId: replaceId,
        characterId: selectedId,
        slot,
        name: replaceId ? undefined : newOutfitName.trim() || undefined,
        description: replaceId ? undefined : newOutfitPrompt.trim() || undefined,
      });
      setNewOutfitName("");
      setNewOutfitPrompt("");
      setCopyOutfitId(outfit.id);
    }, slot === "worn" ? "Foto dela vestida ok." : "Foto da peça ok.");
  }

  async function uploadWornGallery(outfitId: string, files: File[]) {
    if (!selectedId || files.length === 0) return;
    await run(async () => {
      const current = outfits.find((outfit) => outfit.id === outfitId);
      let hasPrimary = Boolean(current?.wornImageUrl);
      for (const source of files) {
        const file = await prepareImageFile(source);
        await api.studio.outfits.upload(file, {
          outfitId,
          characterId: selectedId,
          slot: "worn",
          appendWorn: hasPrimary,
        });
        hasPrimary = true;
      }
    }, `${files.length} ${files.length === 1 ? "foto adicionada" : "fotos adicionadas"} ao look.`);
  }

  async function removeWornPhoto(ref: WornPhotoRef) {
    await run(async () => {
      await api.studio.outfits.update(ref.outfitId, { removeWornUrl: ref.url });
    }, "Foto vestida excluída.");
  }

  async function setPrimaryWornPhoto(ref: WornPhotoRef) {
    await run(async () => {
      await api.studio.outfits.update(ref.outfitId, { setPrimaryWorn: ref.url });
    }, "Foto definida como capa.");
  }

  async function copyOutfit() {
    if (!copyOutfitId || !copyTargetId) return;
    await run(async () => {
      await api.studio.characters.update(copyTargetId, {
        addOutfitId: copyOutfitId,
      });
    }, "Roupa copiada para a outra personagem.");
  }

  async function reorderWardrobe(fromId: string, toId: string) {
    if (!selectedId || !selected || fromId === toId) return;
    const ids = [...selected.outfitIds];
    const from = ids.indexOf(fromId);
    const to = ids.indexOf(toId);
    if (from < 0 || to < 0) return;
    ids.splice(from, 1);
    ids.splice(to, 0, fromId);
    setList((prev) =>
      prev.map((c) => (c.id === selectedId ? { ...c, outfitIds: ids } : c)),
    );
    setDragOutfitId(null);
    setDragOverOutfitId(null);
    try {
      await api.studio.characters.update(selectedId, { outfitIds: ids });
      setMsg("Ordem dos looks salva.");
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao salvar a ordem.");
      await reload().catch(() => undefined);
    }
  }

  async function attachScene(sceneId: string) {
    if (!selectedId || !sceneId) return;
    await run(async () => {
      await api.studio.characters.update(selectedId, { addSceneId: sceneId });
      setSelectedSceneId(sceneId);
    }, "Cenário dela.");
  }

  async function createAndAttachScene() {
    if (!selectedId) return;
    if (!newScenePrompt.trim() && !newSceneName.trim()) return;
    await run(async () => {
      const { scene } = await api.studio.scenes.create({
        name: newSceneName.trim(),
        description: newScenePrompt.trim(),
      });
      await api.studio.characters.update(selectedId, { addSceneId: scene.id });
      setNewSceneName("");
      setNewScenePrompt("");
      setSelectedSceneId(scene.id);
    }, "Cenário criado e ligado a ela.");
  }

  async function uploadScenePhoto(
    file: File,
    opts?: { replaceId?: string; slot?: "place" | "inScene" },
  ) {
    if (!selectedId) return;
    const slot = opts?.slot || "place";
    const replaceId = opts?.replaceId;
    await run(async () => {
      const prepared = await prepareImageFile(file);
      const { scene } = await api.studio.scenes.upload(prepared, {
        sceneId: replaceId,
        characterId: selectedId,
        slot,
        name: replaceId ? undefined : newSceneName.trim() || undefined,
        description: replaceId ? undefined : newScenePrompt.trim() || undefined,
      });
      setNewSceneName("");
      setNewScenePrompt("");
      setSelectedSceneId(scene.id);
    }, slot === "inScene" ? "Foto dela no cenário ok." : "Foto do lugar ok.");
  }

  return (
    <div>
      {storageWarning ? (
        <div className="mb-4 rounded-xl border border-[var(--danger)]/40 bg-[var(--danger)]/10 px-4 py-3 text-sm text-[var(--danger)]">
          {storageWarning}
        </div>
      ) : null}
      <PageHeader
        title="Biblioteca"
        subtitle="Banco da personagem + roupas e cenários reutilizáveis. Depois é só juntar na criação."
        actions={
          <Button loading={busy} onClick={() => void createNew()}>
            <Plus size={16} />
            Nova personagem
          </Button>
        }
      />
      <LibraryTabs />

      <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
        <Panel title="Personagens">
          {list.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">
              Nenhuma. Clique em Nova personagem.
            </p>
          ) : (
            <ul className="space-y-1">
              {list.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(c.id)}
                    className={`w-full rounded-xl px-3 py-2.5 text-left text-sm ${
                      c.id === selectedId
                        ? "bg-[var(--accent-soft)] font-semibold text-[var(--ink)]"
                        : "hover:bg-[var(--panel-elevated)] text-[var(--muted)]"
                    }`}
                  >
                    {c.identity.displayName}
                    <span className="mt-0.5 block text-[11px] font-normal text-[var(--muted)]">
                      {c.outfitIds.length} roupas · {c.movements.length} mov.
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {error && !selected ? (
          <p className="mb-2 text-xs text-[var(--danger)] lg:col-span-2">{error}</p>
        ) : null}
        {!selected ? (
          <Panel title="Selecione">
            <p className="text-sm text-[var(--muted)]">
              Escolha uma personagem à esquerda ou crie uma nova.
            </p>
            {msg ? (
              <p className="mt-2 text-xs text-[var(--success-text)]">{msg}</p>
            ) : null}
          </Panel>
        ) : (
          <div className="space-y-4">
            <Panel title="Visual dela">
              <div className="space-y-3">
                <Field label="Nome">
                  <input
                    className={inputClass}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </Field>
                <Field label="Prompt do visual (identidade travada)">
                  <textarea
                    className={inputClass}
                    rows={5}
                    value={identityPrompt}
                    onChange={(e) => setIdentityPrompt(e.target.value)}
                    placeholder="Cole o prompt completo dela…"
                  />
                </Field>
              </div>
            </Panel>

            <Panel title="Fotos">
              {error ? (
                <p className="mb-3 text-xs text-[var(--danger)]">{error}</p>
              ) : null}
              {msg ? (
                <p className="mb-3 text-xs text-[var(--success-text)]">{msg}</p>
              ) : null}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="mb-2 text-xs font-medium text-[var(--ink)]">
                    Foto do rosto
                  </p>
                  <PhotoPickSlot
                    src={selected.faceImageUrl}
                    alt="Rosto"
                    emptyLabel="Sem foto"
                    buttonLabel={
                      selected.faceImageUrl ? "Trocar rosto" : "Enviar rosto"
                    }
                    disabled={busy}
                    onFile={(f) => void upload("face", f)}
                  />
                </div>
                <div>
                  <p className="mb-2 text-xs font-medium text-[var(--ink)]">
                    Foto do corpo
                  </p>
                  <PhotoPickSlot
                    src={selected.bodyImageUrl}
                    alt="Corpo"
                    emptyLabel="Sem foto"
                    aspectClass="aspect-[3/4]"
                    buttonLabel={
                      selected.bodyImageUrl ? "Trocar corpo" : "Enviar corpo"
                    }
                    disabled={busy}
                    onFile={(f) => void upload("body", f)}
                  />
                </div>
              </div>
            </Panel>

            <Panel title="Corpo">
              <div className="space-y-3">
                <Field label="Detalhes do corpo">
                  <textarea
                    className={inputClass}
                    rows={2}
                    value={bodyDetails}
                    onChange={(e) => setBodyDetails(e.target.value)}
                    placeholder="Altura aparente, biotipo, proporções…"
                  />
                </Field>
                <Field label="Prompt do corpo">
                  <textarea
                    className={inputClass}
                    rows={3}
                    value={bodyPrompt}
                    onChange={(e) => setBodyPrompt(e.target.value)}
                    placeholder="Prompt travado do corpo para o gerador…"
                  />
                </Field>
                <Button loading={busy} onClick={() => void saveCore()}>
                  Salvar visual e corpo
                </Button>
              </div>
            </Panel>

            <Panel
              title="Looks dela"
              description="Clique em um look para ver e adicionar várias fotos dela com a mesma roupa. Arraste para reorganizar."
            >
              {wardrobe.length === 0 ? (
                <p className="mb-3 text-sm text-[var(--muted)]">
                  Nenhum look ainda. Envie a foto da peça e/ou dela vestida.
                </p>
              ) : (
                <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                  {wardrobe.map((o) => (
                    <OutfitCard
                      key={o.id}
                      outfit={o}
                      selected={copyOutfitId === o.id}
                      onSelect={() => setCopyOutfitId(o.id)}
                      onOpenWornGallery={() => setGalleryOutfitId(o.id)}
                      draggable
                      dragging={dragOutfitId === o.id}
                      dragOver={dragOverOutfitId === o.id}
                      onDragStart={(e) => {
                        setDragOutfitId(o.id);
                        e.dataTransfer.effectAllowed = "move";
                        e.dataTransfer.setData("text/plain", o.id);
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                        if (dragOverOutfitId !== o.id) setDragOverOutfitId(o.id);
                      }}
                      onDragLeave={() => {
                        if (dragOverOutfitId === o.id) setDragOverOutfitId(null);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const fromId =
                          e.dataTransfer.getData("text/plain") || dragOutfitId;
                        if (fromId) void reorderWardrobe(fromId, o.id);
                      }}
                      onDragEnd={() => {
                        setDragOutfitId(null);
                        setDragOverOutfitId(null);
                      }}
                      onMovePhoto={(from) =>
                        void run(async () => {
                          await api.studio.outfits.update(o.id, {
                            movePhoto:
                              from === "piece"
                                ? "pieceToWorn"
                                : "wornToPiece",
                          });
                        }, "Foto colocada no lugar certo.")
                      }
                      onDeletePhoto={(slot) => {
                        const label =
                          slot === "piece"
                            ? "a foto da peça"
                            : "a foto dela vestida";
                        if (
                          !window.confirm(
                            `Tem certeza que deseja excluir ${label}?`,
                          )
                        ) {
                          return;
                        }
                        void run(async () => {
                          await api.studio.outfits.update(o.id, {
                            clearPhoto: slot,
                          });
                        }, "Foto excluída.")
                      }}
                      onRemove={() => {
                        if (
                          !window.confirm(
                            "Tem certeza que deseja tirar este look do guarda-roupa? Ele continuará na biblioteca.",
                          )
                        ) {
                          return;
                        }
                        void run(async () => {
                          await api.studio.characters.update(selectedId, {
                            removeOutfitId: o.id,
                          });
                          if (copyOutfitId === o.id) setCopyOutfitId("");
                        }, "Tirou do guarda-roupa (continua na biblioteca).");
                      }}
                    />
                  ))}
                </div>
              )}

              {selectedLook ? (
                <div className="mb-3 space-y-3 rounded-xl border border-[var(--line)] p-3">
                  <p className="text-xs font-medium text-[var(--ink)]">
                    Look selecionado
                    {selectedLook.name?.trim()
                      ? ` · ${outfitLabel(selectedLook)}`
                      : " · sem nome"}
                  </p>
                  <p className="text-[11px] text-[var(--muted)]">
                    Miniaturas — clique na foto para ampliar.
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <div>
                      <p className="mb-1.5 text-[11px] font-medium text-[var(--muted)]">
                        Peça
                      </p>
                      <PhotoPickSlot
                        compact
                        src={selectedLook.imageUrl}
                        alt="Peça"
                        emptyLabel="Sem peça"
                        buttonLabel={
                          selectedLook.imageUrl ? "Trocar" : "Enviar"
                        }
                        disabled={busy}
                        onFile={(f) =>
                          void uploadOutfitPhoto(f, {
                            replaceId: selectedLook.id,
                            slot: "piece",
                          })
                        }
                        onRemove={
                          selectedLook.imageUrl
                            ? () =>
                                void run(async () => {
                                  await api.studio.outfits.update(selectedLook.id, {
                                    clearPhoto: "piece",
                                  });
                                }, "Foto da peça excluída.")
                            : undefined
                        }
                      />
                      {selectedLook.imageUrl ? (
                        <Button
                          className="mt-2"
                          variant="ghost"
                          disabled={busy}
                          onClick={() =>
                            void run(async () => {
                              await api.studio.outfits.update(selectedLook.id, {
                                movePhoto: "pieceToWorn",
                              });
                            }, "Foto movida para Ela vestida.")
                          }
                        >
                          → Vestida
                        </Button>
                      ) : null}
                    </div>
                    <div>
                      <p className="mb-1.5 text-[11px] font-medium text-[var(--muted)]">
                        Ela vestida
                      </p>
                      <PhotoPickSlot
                        compact
                        src={selectedLook.wornImageUrl}
                        alt="Ela vestida"
                        emptyLabel="Sem foto"
                        buttonLabel={
                          selectedLook.wornImageUrl ? "Trocar" : "Enviar"
                        }
                        disabled={busy}
                        onFile={(f) =>
                          void uploadOutfitPhoto(f, {
                            replaceId: selectedLook.id,
                            slot: "worn",
                          })
                        }
                        onRemove={
                          selectedLook.wornImageUrl
                            ? () =>
                                void run(async () => {
                                  await api.studio.outfits.update(selectedLook.id, {
                                    clearPhoto: "worn",
                                  });
                                }, "Foto dela vestida excluída.")
                            : undefined
                        }
                      />
                      {selectedLook.wornImageUrl ? (
                        <Button
                          className="mt-2"
                          variant="ghost"
                          disabled={busy}
                          onClick={() =>
                            void run(async () => {
                              await api.studio.outfits.update(selectedLook.id, {
                                movePhoto: "wornToPiece",
                              });
                            }, "Foto movida para Peça.")
                          }
                        >
                          ← Peça
                        </Button>
                      ) : null}
                    </div>
                  </div>
                  {(selectedLook.imageUrl || selectedLook.wornImageUrl) ? (
                    <Button
                      variant="secondary"
                      disabled={busy}
                      onClick={() =>
                        void run(async () => {
                          await api.studio.outfits.update(selectedLook.id, {
                            swapPhotoSlots: true,
                          });
                        }, "Peça e Ela vestida trocadas de lado.")
                      }
                    >
                      Trocar de lado (Peça ↔ Vestida)
                    </Button>
                  ) : null}
                  <p className="text-[11px] text-[var(--muted)]">
                    Se a foto dela vestida caiu em Peça (ou o contrário), use os
                    botões acima para corrigir.
                  </p>
                  <input
                    className={inputClass}
                    placeholder="Nome (opcional)"
                    value={editOutfitName}
                    onChange={(e) => setEditOutfitName(e.target.value)}
                  />
                  <Button
                    variant="secondary"
                    onClick={() =>
                      void run(async () => {
                        await api.studio.outfits.update(selectedLook.id, {
                          name: editOutfitName,
                        });
                      }, "Nome salvo.")
                    }
                  >
                    Salvar nome
                  </Button>
                  <div className="flex flex-wrap gap-2 border-t border-[var(--line)] pt-3">
                    <Button
                      variant="danger"
                      disabled={busy}
                      onClick={() =>
                        void run(async () => {
                          await api.studio.characters.update(selectedId, {
                            removeOutfitId: selectedLook.id,
                          });
                          if (copyOutfitId === selectedLook.id) {
                            setCopyOutfitId("");
                          }
                        }, "Look removido do guarda-roupa.")
                      }
                    >
                      <Trash2 size={14} />
                      Tirar do guarda-roupa
                    </Button>
                    <Button
                      variant="danger"
                      disabled={busy}
                      onClick={() => {
                        if (
                          !window.confirm(
                            "Apagar este look da biblioteca? Personagens que usam essa roupa perdem a referência.",
                          )
                        ) {
                          return;
                        }
                        void run(async () => {
                          await api.studio.outfits.remove(selectedLook.id);
                          await api.studio.characters.update(selectedId, {
                            removeOutfitId: selectedLook.id,
                          });
                          if (copyOutfitId === selectedLook.id) {
                            setCopyOutfitId("");
                          }
                        }, "Look excluído da biblioteca.");
                      }}
                    >
                      <Trash2 size={14} />
                      Excluir look
                    </Button>
                  </div>
                </div>
              ) : null}

              {availableOutfits.length > 0 ? (
                <div className="mb-3">
                  <p className="mb-2 text-xs font-medium text-[var(--ink)]">
                    Da biblioteca — clique para adicionar a ela
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                    {availableOutfits.map((o) => (
                      <OutfitCard
                        key={o.id}
                        outfit={o}
                        onSelect={() => void attachOutfit(o.id)}
                      />
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="space-y-2 border-t border-[var(--line)] pt-3">
                <p className="text-xs font-medium text-[var(--ink)]">
                  Novo look
                </p>
                <div className="flex flex-wrap gap-2">
                  <FilePickButton
                    accept="image/*,.heic,.heif"
                    label="Foto da peça"
                    disabled={busy}
                    onFile={(f) => void uploadOutfitPhoto(f, { slot: "piece" })}
                  />
                  <FilePickButton
                    accept="image/*,.heic,.heif"
                    label="Ela vestida"
                    disabled={busy}
                    onFile={(f) => void uploadOutfitPhoto(f, { slot: "worn" })}
                  />
                </div>
                <input
                  className={inputClass}
                  placeholder="Nome (opcional)"
                  value={newOutfitName}
                  onChange={(e) => setNewOutfitName(e.target.value)}
                />
                <textarea
                  className={inputClass}
                  rows={2}
                  placeholder="Prompt da roupa (opcional)"
                  value={newOutfitPrompt}
                  onChange={(e) => setNewOutfitPrompt(e.target.value)}
                />
                <Button
                  variant="ghost"
                  disabled={!newOutfitName.trim() && !newOutfitPrompt.trim()}
                  onClick={() => void createAndAttachOutfit()}
                >
                  Criar sem foto
                </Button>
              </div>

              {wardrobe.length > 0 && others.length > 0 ? (
                <div className="mt-3 space-y-2 border-t border-[var(--line)] pt-3">
                  <p className="text-xs font-medium text-[var(--ink)]">
                    Copiar a roupa selecionada para outra personagem
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <select
                      className={`${inputClass} flex-1`}
                      value={copyTargetId}
                      onChange={(e) => setCopyTargetId(e.target.value)}
                    >
                      <option value="">Personagem…</option>
                      {others.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.identity.displayName}
                        </option>
                      ))}
                    </select>
                    <Button
                      variant="secondary"
                      disabled={!copyOutfitId || !copyTargetId}
                      onClick={() => void copyOutfit()}
                    >
                      Copiar
                    </Button>
                  </div>
                </div>
              ) : null}
            </Panel>

            <Panel
              title="Movimentos"
              description="Organizados só para esta personagem."
            >
              <ul className="mb-3 space-y-2">
                {(selected.movements || []).map((m) => (
                  <li
                    key={m.id}
                    className="flex items-start justify-between gap-2 rounded-xl border border-[var(--line)] p-3 text-sm"
                  >
                    <div>
                      <p className="font-medium text-[var(--ink)]">{m.name}</p>
                      <p className="text-xs text-[var(--muted)]">{m.prompt}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        void run(async () => {
                          await api.studio.characters.update(selectedId, {
                            removeMovementId: m.id,
                          });
                        })
                      }
                    >
                      <Trash2 size={14} className="text-[var(--muted)]" />
                    </button>
                  </li>
                ))}
              </ul>
              <div className="space-y-2">
                <input
                  className={inputClass}
                  placeholder="Nome do movimento"
                  value={moveName}
                  onChange={(e) => setMoveName(e.target.value)}
                />
                <textarea
                  className={inputClass}
                  rows={2}
                  placeholder="Prompt do movimento"
                  value={movePrompt}
                  onChange={(e) => setMovePrompt(e.target.value)}
                />
                <Button variant="secondary" onClick={() => void addMovement()}>
                  Adicionar movimento
                </Button>
              </div>
            </Panel>

            <Panel
              title="Cenários dela"
              description="Por foto: o lugar e, se tiver, ela já nesse lugar. Na criação dá para usar o cenário que já está na imagem."
            >
              {pinnedScenes.length === 0 ? (
                <p className="mb-3 text-sm text-[var(--muted)]">
                  Nenhum cenário ainda. Envie a foto do lugar ou dela no lugar.
                </p>
              ) : (
                <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {pinnedScenes.map((s) => (
                    <SceneCard
                      key={s.id}
                      scene={s}
                      selected={selectedSceneId === s.id}
                      onSelect={() => setSelectedSceneId(s.id)}
                      onRemove={() =>
                        void run(async () => {
                          await api.studio.characters.update(selectedId, {
                            removePinnedSceneId: s.id,
                          });
                          if (selectedSceneId === s.id) setSelectedSceneId("");
                        })
                      }
                    />
                  ))}
                </div>
              )}

              {selectedScene ? (
                <div className="mb-3 space-y-3 rounded-xl border border-[var(--line)] p-3">
                  <p className="text-xs font-medium text-[var(--ink)]">
                    Cenário selecionado
                    {selectedScene.name?.trim()
                      ? ` · ${sceneLabel(selectedScene)}`
                      : " · sem nome"}
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="mb-1.5 text-[11px] font-medium text-[var(--muted)]">
                        Lugar
                      </p>
                      <PhotoPickSlot
                        src={selectedScene.imageUrl}
                        alt="Lugar"
                        emptyLabel="Sem foto do lugar"
                        aspectClass="aspect-[3/4]"
                        buttonLabel={
                          selectedScene.imageUrl ? "Trocar lugar" : "Enviar lugar"
                        }
                        disabled={busy}
                        onFile={(f) =>
                          void uploadScenePhoto(f, {
                            replaceId: selectedScene.id,
                            slot: "place",
                          })
                        }
                      />
                    </div>
                    <div>
                      <p className="mb-1.5 text-[11px] font-medium text-[var(--muted)]">
                        Ela no cenário
                      </p>
                      <PhotoPickSlot
                        src={selectedScene.inSceneImageUrl}
                        alt="Ela no cenário"
                        emptyLabel="Sem foto dela no lugar"
                        aspectClass="aspect-[3/4]"
                        buttonLabel={
                          selectedScene.inSceneImageUrl
                            ? "Trocar ela no lugar"
                            : "Enviar ela no lugar"
                        }
                        disabled={busy}
                        onFile={(f) =>
                          void uploadScenePhoto(f, {
                            replaceId: selectedScene.id,
                            slot: "inScene",
                          })
                        }
                      />
                    </div>
                  </div>
                  <input
                    className={inputClass}
                    placeholder="Nome (opcional)"
                    value={editSceneName}
                    onChange={(e) => setEditSceneName(e.target.value)}
                  />
                  <Button
                    variant="secondary"
                    onClick={() =>
                      void run(async () => {
                        await api.studio.scenes.update(selectedScene.id, {
                          name: editSceneName,
                        });
                      }, "Nome do cenário salvo.")
                    }
                  >
                    Salvar nome
                  </Button>
                </div>
              ) : null}

              {availableScenes.length > 0 ? (
                <div className="mb-3">
                  <p className="mb-2 text-xs font-medium text-[var(--ink)]">
                    Da biblioteca — clique para adicionar a ela
                  </p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {availableScenes.map((s) => (
                      <SceneCard
                        key={s.id}
                        scene={s}
                        onSelect={() => void attachScene(s.id)}
                      />
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="space-y-2 border-t border-[var(--line)] pt-3">
                <p className="text-xs font-medium text-[var(--ink)]">
                  Novo cenário
                </p>
                <div className="flex flex-wrap gap-2">
                  <FilePickButton
                    accept="image/*,.heic,.heif"
                    label="Foto do lugar"
                    disabled={busy}
                    onFile={(f) => void uploadScenePhoto(f, { slot: "place" })}
                  />
                  <FilePickButton
                    accept="image/*,.heic,.heif"
                    label="Ela no cenário"
                    disabled={busy}
                    onFile={(f) => void uploadScenePhoto(f, { slot: "inScene" })}
                  />
                </div>
                <input
                  className={inputClass}
                  placeholder="Nome (opcional)"
                  value={newSceneName}
                  onChange={(e) => setNewSceneName(e.target.value)}
                />
                <textarea
                  className={inputClass}
                  rows={2}
                  placeholder="Prompt do cenário (opcional)"
                  value={newScenePrompt}
                  onChange={(e) => setNewScenePrompt(e.target.value)}
                />
                <Button
                  variant="ghost"
                  disabled={!newSceneName.trim() && !newScenePrompt.trim()}
                  onClick={() => void createAndAttachScene()}
                >
                  Criar sem foto
                </Button>
              </div>
            </Panel>

            <Panel
              title="Voz"
              description="Opcional. Se preencher, entra no prompt de vídeo."
            >
              <div className="space-y-3">
                <Field label="Nome / apelido do timbre">
                  <input
                    className={inputClass}
                    value={voiceName}
                    onChange={(e) => setVoiceName(e.target.value)}
                    placeholder="Ex.: Lia — grave suave"
                  />
                </Field>
                <Field label="Prompt da voz">
                  <textarea
                    className={inputClass}
                    rows={3}
                    value={voicePrompt}
                    onChange={(e) => setVoicePrompt(e.target.value)}
                    placeholder="Como ela fala: timbre, ritmo, sotaque…"
                  />
                </Field>
                <Field label="Notas">
                  <input
                    className={inputClass}
                    value={voiceNotes}
                    onChange={(e) => setVoiceNotes(e.target.value)}
                  />
                </Field>
                {selected.voice?.audioUrl ? (
                  <audio
                    className="w-full"
                    controls
                    src={selected.voice.audioUrl}
                  />
                ) : null}
                <input
                  ref={voiceRef}
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void upload("voice", f);
                  }}
                />
                <div className="flex flex-wrap gap-2">
                  <Button loading={busy} onClick={() => void saveVoice()}>
                    Salvar voz
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => voiceRef.current?.click()}
                  >
                    <Upload size={14} />
                    Enviar áudio
                  </Button>
                </div>
                {characterHasVoice(selected) ? (
                  <p className="text-xs text-[var(--muted)]">
                    Voz cadastrada — na criação você escolhe se inclui.
                  </p>
                ) : null}
              </div>
            </Panel>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  window.location.href = `/gerar?character=${selectedId}`;
                }}
              >
                Usar na criação
              </Button>
              <Button
                variant="danger"
                onClick={() =>
                  void run(async () => {
                    await api.studio.characters.remove(selectedId);
                    setSelectedId("");
                  }, "Personagem excluída.")
                }
              >
                Excluir personagem
              </Button>
            </div>
            {msg ? (
              <p className="text-xs text-[var(--success-text)]">{msg}</p>
            ) : null}
            {error ? (
              <p className="text-xs text-[var(--danger)]">{error}</p>
            ) : null}
          </div>
        )}
      </div>

      {galleryOutfit ? (
        <OutfitWornGalleryDialog
          outfit={galleryOutfit}
          disabled={busy}
          onClose={() => setGalleryOutfitId(null)}
          onUpload={(files) => uploadWornGallery(galleryOutfit.id, files)}
          onRemove={removeWornPhoto}
          onSetPrimary={setPrimaryWornPhoto}
        />
      ) : null}
    </div>
  );
}
