"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Button,
  Field,
  PageHeader,
  Panel,
  inputClass,
} from "@/components/ui/primitives";
import { api } from "@/lib/clientApi";
import { prepareImageFile } from "@/lib/prepareImage";
import { buildCreativeDirectorPrompt, buildOutfitTryOnPrompt } from "@/services/prompt/CreativeDirector";
import { OutfitCard } from "@/components/studio/OutfitCard";
import { SceneCard } from "@/components/studio/SceneCard";
import { FilePickButton } from "@/components/studio/FilePickButton";
import { AspectRatioPicker } from "@/components/studio/AspectRatioPicker";
import { WornPhotoMenu } from "@/components/studio/WornPhotoMenu";
import {
  characterHasVoice,
  collectWornPhotosForWardrobe,
  outfitLabel,
  FRAMING_OPTIONS,
  DEFAULT_ASPECT_RATIO,
  type AspectRatioOption,
  type FramingOption,
  type SavedStudioPrompt,
  type StudioCharacter,
  type StudioMediaKind,
  type StudioOutfit,
  type StudioScene,
  type WornPhotoRef,
} from "@/domain/studioAssets";
import { Copy, Bot, RefreshCw } from "lucide-react";

type AgentJobView = {
  id: string;
  status: string;
  logs: string[];
  resultImageUrl?: string;
  error?: string;
};

export default function GerarStudioPage() {
  const search = useSearchParams();
  const [characters, setCharacters] = useState<StudioCharacter[]>([]);
  const [outfits, setOutfits] = useState<StudioOutfit[]>([]);
  const [scenes, setScenes] = useState<StudioScene[]>([]);
  const [saved, setSaved] = useState<SavedStudioPrompt[]>([]);
  const [characterId, setCharacterId] = useState("");
  const [outfitId, setOutfitId] = useState("");
  const [movementId, setMovementId] = useState("");
  const [sceneId, setSceneId] = useState("");
  const [keepSceneFromPhoto, setKeepSceneFromPhoto] = useState(true);
  const [kind, setKind] = useState<StudioMediaKind>("image");
  const [includeVoice, setIncludeVoice] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [fullPrompt, setFullPrompt] = useState("");
  const [promptDirty, setPromptDirty] = useState(false);
  const [target, setTarget] = useState<"tokfy" | "flow" | "auto">("tokfy");
  const [framing, setFraming] = useState<FramingOption>("full");
  const [aspectRatio, setAspectRatio] =
    useState<AspectRatioOption>(DEFAULT_ASPECT_RATIO);
  const [sceneWornRef, setSceneWornRef] = useState<WornPhotoRef | null>(null);
  const [wornMenuOpen, setWornMenuOpen] = useState(false);
  const [wornMenuAnchor, setWornMenuAnchor] = useState<DOMRect | null>(null);
  const [agentJob, setAgentJob] = useState<AgentJobView | null>(null);

  const selected = characters.find((c) => c.id === characterId);

  const wardrobe = useMemo(
    () => outfits.filter((o) => selected?.outfitIds.includes(o.id)),
    [outfits, selected],
  );
  const otherOutfits = useMemo(
    () => outfits.filter((o) => !selected?.outfitIds.includes(o.id)),
    [outfits, selected],
  );
  const herScenes = useMemo(
    () => scenes.filter((s) => selected?.sceneIds.includes(s.id)),
    [scenes, selected],
  );
  const otherScenes = useMemo(
    () => scenes.filter((s) => !selected?.sceneIds.includes(s.id)),
    [scenes, selected],
  );
  const selectedOutfit = outfits.find((o) => o.id === outfitId);
  const selectedMovement = selected?.movements.find((m) => m.id === movementId);
  const selectedScene = scenes.find((s) => s.id === sceneId);
  const wardrobeIds = selected?.outfitIds || [];
  const wornRefs = useMemo(
    () => collectWornPhotosForWardrobe(wardrobeIds, outfits),
    [wardrobeIds, outfits],
  );

  useEffect(() => {
    if (!sceneWornRef && wornRefs.length > 0) {
      const preferred = wornRefs.find((r) => r.outfitId === outfitId) || wornRefs[0];
      setSceneWornRef(preferred);
    }
  }, [outfitId, wornRefs, sceneWornRef]);

  const sceneFromPhotoUrl =
    sceneWornRef?.url ||
    selectedOutfit?.wornImageUrl ||
    selectedOutfit?.imageUrl ||
    selected?.bodyImageUrl ||
    selected?.faceImageUrl;

  const tryOnTemplate = useMemo(() => {
    if (!selected || !selectedOutfit) return "";
    if (kind === "video") {
      return buildCreativeDirectorPrompt({
        character: selected,
        outfit: selectedOutfit,
        scene: keepSceneFromPhoto ? null : selectedScene || null,
        libraryMovementPrompt: selectedMovement?.prompt,
        kind: "video",
        keepSceneFromPhoto,
        includeVoice,
        aspectRatio,
      }).fullPrompt;
    }
    return buildOutfitTryOnPrompt({
      character: selected,
      outfit: selectedOutfit,
      movementPrompt: selectedMovement?.prompt,
      keepSceneFromPhoto,
      scene: keepSceneFromPhoto ? null : selectedScene || null,
      framing,
      aspectRatio,
    });
  }, [
    selected,
    selectedOutfit,
    selectedMovement,
    keepSceneFromPhoto,
    selectedScene,
    kind,
    includeVoice,
    framing,
    aspectRatio,
  ]);

  async function handleWornUpload(
    file: File,
    opts: { outfitId: string; append: boolean },
  ) {
    setBusy(true);
    setError("");
    try {
      if (opts.outfitId === "__new__") {
        const { outfit } = await api.studio.outfits.upload(file, {
          characterId,
          slot: "worn",
        });
        setOutfits((prev) => [...prev, outfit]);
        setSceneWornRef({ outfitId: outfit.id, url: outfit.wornImageUrl!, kind: "primary" });
        setOutfitId(outfit.id);
      } else {
        const { outfit } = await api.studio.outfits.upload(file, {
          outfitId: opts.outfitId,
          characterId,
          slot: "worn",
          appendWorn: opts.append,
        });
        setOutfits((prev) =>
          prev.map((o) => (o.id === outfit.id ? outfit : o)),
        );
        const url = opts.append
          ? outfit.wornGallery?.[outfit.wornGallery.length - 1] || outfit.wornImageUrl
          : outfit.wornImageUrl;
        if (url) {
          setSceneWornRef({
            outfitId: outfit.id,
            url,
            kind: opts.append ? "gallery" : "primary",
          });
        }
      }
      setKeepSceneFromPhoto(true);
      setSceneId("");
      setPromptDirty(false);
      setMsg("Foto vestida adicionada.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha no upload.");
    } finally {
      setBusy(false);
    }
  }

  async function handleWornRemove(ref: WornPhotoRef) {
    setBusy(true);
    try {
      await api.studio.outfits.update(ref.outfitId, { removeWornUrl: ref.url });
      const { outfits: listed } = await api.studio.outfits.list();
      setOutfits(listed);
      if (sceneWornRef?.url === ref.url) {
        const next = collectWornPhotosForWardrobe(wardrobeIds, listed)[0] || null;
        setSceneWornRef(next);
      }
      setMsg("Foto vestida excluída.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao excluir.");
    } finally {
      setBusy(false);
    }
  }

  async function handleWornSetPrimary(ref: WornPhotoRef) {
    setBusy(true);
    try {
      const { outfit } = await api.studio.outfits.update(ref.outfitId, {
        setPrimaryWorn: ref.url,
      });
      setOutfits((prev) => prev.map((o) => (o.id === outfit.id ? outfit : o)));
      setSceneWornRef({ ...ref, kind: "primary" });
      setMsg("Foto definida como capa do look.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao atualizar.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void (async () => {
      const [c, o, s, p] = await Promise.allSettled([
        api.studio.characters.list(),
        api.studio.outfits.list(),
        api.studio.scenes.list(),
        api.studio.prompts.list(),
      ]);
      if (c.status !== "fulfilled") throw c.reason;
      setCharacters(c.value.characters);
      if (o.status === "fulfilled") setOutfits(o.value.outfits);
      if (s.status === "fulfilled") setScenes(s.value.scenes);
      if (p.status === "fulfilled") setSaved(p.value.prompts);
      const fromUrl = search.get("character");
      if (fromUrl && c.value.characters.some((x) => x.id === fromUrl)) {
        setCharacterId(fromUrl);
      } else if (c.value.characters[0]) {
        setCharacterId(c.value.characters[0].id);
      }
    })().catch((e) =>
      setError(e instanceof Error ? e.message : "Falha ao carregar"),
    );
  }, [search]);

  useEffect(() => {
    setOutfitId("");
    setMovementId("");
    setSceneId("");
    setKeepSceneFromPhoto(true);
    setIncludeVoice(true);
    setFraming("full");
    setSceneWornRef(null);
    setPromptDirty(false);
    setFullPrompt("");
  }, [characterId]);

  useEffect(() => {
    setPromptDirty(false);
  }, [outfitId]);

  useEffect(() => {
    if (kind !== "image" || !tryOnTemplate) return;
    if (promptDirty) return;
    setFullPrompt(tryOnTemplate);
  }, [tryOnTemplate, kind, promptDirty]);

  function restoreProfessionalPrompt() {
    if (!tryOnTemplate) {
      setError("Escolha personagem e um look da área de roupas.");
      return;
    }
    setPromptDirty(false);
    setFullPrompt(tryOnTemplate);
    setMsg("Prompt profissional de trocar look restaurado — você pode editar.");
    setError("");
  }

  async function generate() {
    if (!characterId) {
      setError("Escolha uma personagem na Biblioteca.");
      return;
    }
    if (kind === "image" && !outfitId) {
      setError("Escolha um look da área de roupas para vestir nela.");
      return;
    }
    setBusy(true);
    setError("");
    setMsg("");
    try {
      const r = await api.studio.prompts.generate({
        characterId,
        outfitId: outfitId || undefined,
        characterMovementId: movementId || undefined,
        sceneId: keepSceneFromPhoto ? undefined : sceneId || undefined,
        kind,
        includeVoice,
        keepSceneFromPhoto,
        save: true,
        mode: kind === "image" ? "tryOn" : "default",
        framing: kind === "image" ? framing : undefined,
        aspectRatio,
        editedPrompt:
          kind === "image" && promptDirty ? fullPrompt : undefined,
      });
      setFullPrompt(r.fullPrompt);
      setPromptDirty(false);
      setMsg(
        kind === "image"
          ? "Prompt pronto (editável). Copie, gere a imagem fora e envie o still no look abaixo."
          : "Prompt de vídeo pronto — copie para a outra plataforma.",
      );
      const p = await api.studio.prompts.list();
      setSaved(p.prompts);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao gerar");
    } finally {
      setBusy(false);
    }
  }

  async function saveStillToLook(file: File) {
    if (!outfitId) {
      setError("Escolha o look acima para salvar a imagem gerada nele.");
      return;
    }
    if (!characterId) {
      setError("Escolha uma personagem.");
      return;
    }
    setBusy(true);
    setError("");
    setMsg("Salvando no look…");
    try {
      const prepared = await prepareImageFile(file);
      const { outfit } = await api.studio.outfits.upload(prepared, {
        outfitId,
        characterId,
        slot: "worn",
      });
      setOutfits((prev) =>
        prev.map((o) => (o.id === outfit.id ? outfit : o)),
      );
      setMsg(
        `Still salvo em Ela vestida · ${outfitLabel(outfit)}. Aparece na Biblioteca.`,
      );
    } catch (e) {
      setMsg("");
      setError(e instanceof Error ? e.message : "Falha ao salvar no look.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    setTarget(kind === "video" ? "tokfy" : "auto");
    setPromptDirty(false);
  }, [kind]);

  async function copyClaudePack() {
    if (!characterId || !outfitId) {
      setError("Escolha personagem e look primeiro.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const pack = await api.studio.claudePack({
        characterId,
        outfitId,
        prompt: fullPrompt || undefined,
        kind,
        target,
        sceneId: keepSceneFromPhoto ? undefined : sceneId || undefined,
        keepSceneFromPhoto,
        movementId: movementId || undefined,
        framing: kind === "image" ? framing : undefined,
        aspectRatio,
      });
      await navigator.clipboard.writeText(pack.markdown);
      setMsg(
        "Pacote copiado — cole no Claude (Computer Use). Ele abre a ferramenta e gera.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao montar pacote Claude.");
    } finally {
      setBusy(false);
    }
  }

  async function runCommand() {
    if (!characterId || !outfitId) {
      setError("Escolha a personagem e o look.");
      return;
    }
    if (!fullPrompt.trim()) {
      setError("Escreva ou restaure o prompt.");
      return;
    }
    await copyClaudePack();
  }

  async function runFlowLocal() {
    if (!characterId || !outfitId || !fullPrompt.trim()) return;
    setBusy(true);
    setError("");
    setMsg(
      kind === "video"
        ? "Enviando comando de VÍDEO ao Flow…"
        : "Enviando comando de FOTO ao Flow…",
    );
    try {
      const { job, tip, referenceCount } = await api.studio.tryOnFlow({
        characterId,
        outfitId,
        prompt: fullPrompt,
        kind,
        tool: "flow",
        sceneId: keepSceneFromPhoto ? undefined : sceneId || undefined,
        keepSceneFromPhoto,
        characterMovementId: movementId || undefined,
      });
      setAgentJob(job);
      setMsg(
        `${tip} (${referenceCount} ref.). Acompanhe o status abaixo.`,
      );
      void pollAgentJob(job.id);
    } catch (e) {
      setMsg("");
      setError(e instanceof Error ? e.message : "Falha ao executar o comando.");
    } finally {
      setBusy(false);
    }
  }

  async function pollAgentJob(jobId: string) {
    for (let i = 0; i < 90; i += 1) {
      await new Promise((r) => setTimeout(r, 2000));
      try {
        const { job } = await api.agent.get(jobId);
        setAgentJob(job);
        if (
          job.status === "completed" ||
          job.status === "failed" ||
          job.status === "cancelled"
        ) {
          if (job.status === "completed" && job.resultImageUrl) {
            setMsg("Imagem pronta no agente — clique em Salvar no look.");
          } else if (job.status === "failed") {
            setError(job.error || "Agente falhou.");
          }
          return;
        }
        if (job.status === "waiting_user") {
          setMsg(
            "Modo assistido: gere/salve no Flow. Se o download cair na pasta monitorada, o still aparece aqui.",
          );
        }
      } catch {
        /* keep polling */
      }
    }
  }

  async function saveAgentResultToLook() {
    if (!outfitId || !agentJob?.resultImageUrl) return;
    setBusy(true);
    setError("");
    try {
      await api.studio.outfits.update(outfitId, {
        wornImageUrl: agentJob.resultImageUrl,
      });
      setOutfits((prev) =>
        prev.map((o) =>
          o.id === outfitId
            ? { ...o, wornImageUrl: agentJob.resultImageUrl }
            : o,
        ),
      );
      setMsg("Still do Flow salvo em Ela vestida.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao salvar no look.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Criação"
        subtitle="Escolha look → prompt → Enviar para Claude. Ele opera Tokfy, Flow ou outra ferramenta."
      />

      <div className="space-y-4">
        <Panel title="1 · O que gerar">
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["image", "Foto (still)"],
                ["video", "Vídeo"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setKind(id);
                  setPromptDirty(false);
                }}
                className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                  kind === id
                    ? "bg-[var(--accent)] text-white"
                    : "border border-[var(--line)] bg-[var(--panel-elevated)] text-[var(--muted)]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="mt-4">
            <AspectRatioPicker
              value={aspectRatio}
              onChange={(v) => {
                setAspectRatio(v);
                setPromptDirty(false);
              }}
            />
          </div>
        </Panel>

        <Panel title="2 · Personagem">
          {characters.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">
              Nenhuma personagem.{" "}
              <a className="text-[var(--accent)]" href="/personagens">
                Abrir biblioteca
              </a>
              .
            </p>
          ) : (
            <Field label="Personagem">
              <select
                className={inputClass}
                value={characterId}
                onChange={(e) => setCharacterId(e.target.value)}
              >
                {characters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.identity.displayName}
                  </option>
                ))}
              </select>
            </Field>
          )}
          {selected ? (
            <div className="mt-3 flex gap-3">
              {selected.faceImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selected.faceImageUrl}
                  alt=""
                  className="h-16 w-16 rounded-lg object-cover"
                />
              ) : null}
              {selected.bodyImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selected.bodyImageUrl}
                  alt=""
                  className="h-16 w-12 rounded-lg object-cover"
                />
              ) : null}
            </div>
          ) : null}
        </Panel>

        <Panel title="3 · Look">
          <p className="mb-2 text-[13px] font-medium text-[var(--ink)]">
            Escolha o look — toque no card (Peça ou Vestida). A lupa só amplia.
          </p>
          {wardrobe.length === 0 && otherOutfits.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">
              Sem looks. Cadastre a peça em{" "}
              <a className="text-[var(--accent)]" href="/personagens">
                Biblioteca
              </a>
              .
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {wardrobe.map((o) => (
                <OutfitCard
                  key={o.id}
                  outfit={o}
                  selected={outfitId === o.id}
                  onSelect={() => setOutfitId(o.id)}
                />
              ))}
              {otherOutfits.map((o) => (
                <OutfitCard
                  key={o.id}
                  outfit={o}
                  selected={outfitId === o.id}
                  onSelect={() => setOutfitId(o.id)}
                />
              ))}
            </div>
          )}

          <div className="mt-4 space-y-3">
            {kind === "image" ? (
              <div>
                <p className="mb-2 text-[13px] font-medium text-[var(--ink)]">
                  Proporção da foto
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {FRAMING_OPTIONS.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => {
                        setFraming(f.id);
                        setPromptDirty(false);
                      }}
                      title={f.hint}
                      className={`rounded-xl border px-2 py-2 text-center text-[11px] font-medium ${
                        framing === f.id
                          ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                          : "border-[var(--line)] bg-[var(--panel-elevated)] text-[var(--muted)]"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            <Field label={kind === "image" ? "Pose / movimento (opcional)" : "Movimento"}>
              <select
                className={inputClass}
                value={movementId}
                onChange={(e) => {
                  setMovementId(e.target.value);
                  setPromptDirty(false);
                }}
              >
                <option value="">Padrão profissional</option>
                {(selected?.movements || []).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </Field>

            <p className="text-[13px] font-medium text-[var(--ink)]">Cenário</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <button
                type="button"
                onClick={(e) => {
                  setKeepSceneFromPhoto(true);
                  setSceneId("");
                  setPromptDirty(false);
                  setWornMenuAnchor(e.currentTarget.getBoundingClientRect());
                  setWornMenuOpen(true);
                }}
                className={`overflow-hidden rounded-xl border text-left ${
                  keepSceneFromPhoto
                    ? "border-[var(--accent)] ring-2 ring-[var(--accent-soft)]"
                    : "border-[var(--line)] hover:border-[var(--accent)]"
                }`}
              >
                {sceneFromPhotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={sceneFromPhotoUrl}
                    alt="Cenário da imagem"
                    className="aspect-square w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-square items-center justify-center bg-[var(--panel-elevated)] px-3 text-center text-xs text-[var(--muted)]">
                    Toque para escolher
                  </div>
                )}
                <p className="px-2 py-1.5 text-[11px] font-medium text-[var(--ink)]">
                  Ela vestida
                  {wornRefs.length > 1 ? ` (${wornRefs.length})` : ""}
                </p>
              </button>
              {[...herScenes, ...otherScenes].map((s) => (
                <SceneCard
                  key={s.id}
                  scene={s}
                  selected={!keepSceneFromPhoto && sceneId === s.id}
                  onSelect={() => {
                    setKeepSceneFromPhoto(false);
                    setSceneId(s.id);
                    setPromptDirty(false);
                  }}
                />
              ))}
            </div>

            {selected && characterHasVoice(selected) && kind === "video" ? (
              <label className="flex items-center gap-2 text-sm text-[var(--ink)]">
                <input
                  type="checkbox"
                  checked={includeVoice}
                  onChange={(e) => setIncludeVoice(e.target.checked)}
                />
                Incluir voz de{" "}
                {selected.voice?.name || selected.identity.displayName}
              </label>
            ) : null}
          </div>
        </Panel>

        <Panel
          title="4 · Prompt"
          description={
            selectedOutfit
              ? `Look: ${outfitLabel(selectedOutfit)} · ${kind === "image" ? "foto" : "vídeo"}`
              : "Selecione um look para montar o prompt."
          }
        >
          <textarea
            className={`${inputClass} min-h-[240px] font-mono text-[11px] leading-4`}
            value={fullPrompt}
            placeholder="Escolha personagem + look — o prompt aparece aqui e você pode mudar…"
            onChange={(e) => {
              setFullPrompt(e.target.value);
              setPromptDirty(true);
            }}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="secondary"
              disabled={!tryOnTemplate}
              onClick={restoreProfessionalPrompt}
            >
              <RefreshCw size={14} />
              Restaurar prompt
            </Button>
            <Button
              variant="secondary"
              disabled={!fullPrompt.trim()}
              onClick={() =>
                void navigator.clipboard
                  .writeText(fullPrompt)
                  .then(() => setMsg("Prompt copiado."))
              }
            >
              <Copy size={14} />
              Só copiar prompt
            </Button>
          </div>
        </Panel>

        <Panel title="5 · Enviar para Claude">
          <Field label="Onde o Claude deve gerar">
            <select
              className={inputClass}
              value={target}
              onChange={(e) =>
                setTarget(e.target.value as "tokfy" | "flow" | "auto")
              }
            >
              <option value="tokfy">Tokfy (vídeo + ChatGPT)</option>
              <option value="flow">Google Flow</option>
              <option value="auto">Claude escolhe</option>
            </select>
          </Field>
          <p className="mb-3 mt-2 text-xs text-[var(--muted)]">
            Copia o pacote (prompt + fotos + passos). Cole no Claude Desktop com
            Computer Use — ele abre a ferramenta e executa.
          </p>
          <Button
            className="w-full"
            loading={busy}
            disabled={!characterId || !outfitId || !fullPrompt.trim()}
            onClick={() => void runCommand()}
          >
            <Bot size={16} />
            Enviar para Claude
          </Button>

          <details className="mt-4 rounded-xl border border-[var(--line)] p-3">
            <summary className="cursor-pointer text-xs font-medium text-[var(--muted)]">
              Avançado: abrir Flow no PC (sem Claude)
            </summary>
            <p className="mt-2 text-[11px] text-[var(--muted)]">
              Só funciona localmente com DICloak/Playwright instalado.
            </p>
            <Button
              className="mt-2 w-full"
              variant="secondary"
              loading={busy}
              disabled={!characterId || !outfitId || !fullPrompt.trim()}
              onClick={() => void runFlowLocal()}
            >
              Abrir Flow no PC
            </Button>
          </details>
        </Panel>

        {error ? <p className="text-xs text-[var(--danger)]">{error}</p> : null}
        {msg ? (
          <p className="text-xs text-[var(--success-text)]">{msg}</p>
        ) : null}

        {agentJob ? (
          <Panel title="Status do comando">
            <p className="mb-2 text-xs text-[var(--muted)]">
              Status: <strong>{agentJob.status}</strong>
              {agentJob.error ? ` — ${agentJob.error}` : ""}
            </p>
            {agentJob.logs?.length ? (
              <pre className="mb-3 max-h-40 overflow-auto rounded-lg border border-[var(--line)] bg-[var(--panel-elevated)] p-2 text-[10px] text-[var(--muted)]">
                {agentJob.logs.slice(-12).join("\n")}
              </pre>
            ) : null}
            {agentJob.resultImageUrl ? (
              <div className="space-y-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={agentJob.resultImageUrl}
                  alt="Resultado"
                  className="h-40 w-28 rounded-lg object-cover"
                />
                {kind === "image" ? (
                  <Button
                    loading={busy}
                    disabled={!outfitId}
                    onClick={() => void saveAgentResultToLook()}
                  >
                    Salvar no look (Ela vestida)
                  </Button>
                ) : null}
              </div>
            ) : null}
          </Panel>
        ) : null}

        {kind === "image" ? (
          <Panel title="Salvar still no look">
            <p className="mb-3 text-[11px] text-[var(--muted)]">
              Se gerou fora, envie o still — grava em{" "}
              <strong>Ela vestida</strong>.
            </p>
            {selectedOutfit?.wornImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={selectedOutfit.wornImageUrl}
                alt="Ela vestida"
                className="mb-3 h-24 w-24 rounded-lg object-cover"
              />
            ) : null}
            <FilePickButton
              accept="image/*,.heic,.heif"
              label={
                selectedOutfit?.wornImageUrl
                  ? "Trocar still no look"
                  : "Enviar still gerado"
              }
              disabled={busy || !outfitId}
              onFile={(f) => void saveStillToLook(f)}
            />
          </Panel>
        ) : null}

        {saved.length > 0 ? (
          <Panel title="Últimos prompts">
            <ul className="space-y-1 text-sm">
              {saved.slice(0, 5).map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className="w-full rounded-lg px-2 py-2 text-left hover:bg-[var(--panel-elevated)]"
                    onClick={() => {
                      setFullPrompt(p.fullPrompt);
                      setPromptDirty(true);
                      if (p.kind) setKind(p.kind);
                    }}
                  >
                    {p.title}
                  </button>
                </li>
              ))}
            </ul>
          </Panel>
        ) : null}
      </div>

      <WornPhotoMenu
        open={wornMenuOpen}
        anchorRect={wornMenuAnchor}
        onClose={() => setWornMenuOpen(false)}
        wardrobeOutfitIds={wardrobeIds}
        outfits={outfits}
        activeOutfitId={outfitId}
        selectedRef={sceneWornRef}
        disabled={busy}
        onSelect={(ref) => {
          setSceneWornRef(ref);
          setKeepSceneFromPhoto(true);
          setSceneId("");
          setPromptDirty(false);
        }}
        onUpload={handleWornUpload}
        onRemove={handleWornRemove}
        onSetPrimary={handleWornSetPrimary}
      />
    </div>
  );
}
