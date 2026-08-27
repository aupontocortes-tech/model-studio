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
import { buildOutfitTryOnPrompt } from "@/services/prompt/CreativeDirector";
import { OutfitCard } from "@/components/studio/OutfitCard";
import { SceneCard } from "@/components/studio/SceneCard";
import { FilePickButton } from "@/components/studio/FilePickButton";
import {
  characterHasVoice,
  outfitLabel,
  type SavedStudioPrompt,
  type StudioCharacter,
  type StudioMediaKind,
  type StudioOutfit,
  type StudioScene,
} from "@/domain/studioAssets";
import { Copy, RefreshCw, WandSparkles } from "lucide-react";

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
  const sceneFromPhotoUrl =
    selectedOutfit?.wornImageUrl ||
    selectedOutfit?.imageUrl ||
    selected?.bodyImageUrl ||
    selected?.faceImageUrl;

  const tryOnTemplate = useMemo(() => {
    if (!selected || !selectedOutfit) return "";
    return buildOutfitTryOnPrompt({
      character: selected,
      outfit: selectedOutfit,
      movementPrompt: selectedMovement?.prompt,
      keepSceneFromPhoto,
      scene: keepSceneFromPhoto ? null : selectedScene || null,
    });
  }, [
    selected,
    selectedOutfit,
    selectedMovement,
    keepSceneFromPhoto,
    selectedScene,
  ]);

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

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Criação"
        subtitle="Escolha o look → use o prompt profissional (editável) → gere a imagem fora → salve em Ela vestida."
      />

      <div className="space-y-4">
        <Panel title="1 · Trocar look (imagem)">
          <p className="mb-3 text-xs leading-5 text-[var(--muted)]">
            Prompt profissional já montado para vestir a roupa do guarda-roupa
            nela. Você pode editar o texto antes de copiar.
          </p>
          <div className="flex gap-2">
            {(
              [
                ["image", "Trocar look"],
                ["video", "Prompt de vídeo"],
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

        <Panel title="3 · Look da área de roupas">
          <p className="mb-2 text-[13px] font-medium text-[var(--ink)]">
            Escolha a peça — o prompt veste essa roupa nela
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
                onClick={() => {
                  setKeepSceneFromPhoto(true);
                  setSceneId("");
                  setPromptDirty(false);
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
                    Sem foto ainda
                  </div>
                )}
                <p className="px-2 py-1.5 text-[11px] font-medium text-[var(--ink)]">
                  Cenário da imagem dela
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
          title="4 · Prompt profissional (editável)"
          description={
            selectedOutfit
              ? `Look: ${outfitLabel(selectedOutfit)} — edite à vontade antes de copiar.`
              : "Selecione um look acima para montar o prompt."
          }
        >
          <textarea
            className={`${inputClass} min-h-[280px] font-mono text-[11px] leading-4`}
            value={fullPrompt}
            placeholder="Escolha personagem + look para carregar o prompt profissional de vestir a roupa nela…"
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
              Restaurar prompt profissional
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
              Copiar
            </Button>
            <Button
              loading={busy}
              disabled={!characterId || (kind === "image" && !outfitId)}
              onClick={() => void generate()}
            >
              <WandSparkles size={16} />
              {kind === "image" ? "Salvar este prompt" : "Gerar prompt de vídeo"}
            </Button>
          </div>
        </Panel>

        {error ? <p className="text-xs text-[var(--danger)]">{error}</p> : null}
        {msg ? (
          <p className="text-xs text-[var(--success-text)]">{msg}</p>
        ) : null}

        {kind === "image" ? (
          <Panel title="5 · Depois de gerar a imagem">
            <p className="mb-3 text-[11px] text-[var(--muted)]">
              Cole o prompt no gerador (Flow etc.), baixe o still e envie aqui —
              grava em <strong>Ela vestida</strong> deste look.
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
    </div>
  );
}
