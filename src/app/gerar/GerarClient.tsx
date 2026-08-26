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
import { OutfitCard } from "@/components/studio/OutfitCard";
import { SceneCard } from "@/components/studio/SceneCard";
import {
  characterHasVoice,
  type SavedStudioPrompt,
  type StudioCharacter,
  type StudioMediaKind,
  type StudioOutfit,
  type StudioScene,
} from "@/domain/studioAssets";
import { Copy, WandSparkles } from "lucide-react";

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
  const sceneFromPhotoUrl =
    selectedOutfit?.wornImageUrl ||
    selectedOutfit?.imageUrl ||
    selected?.bodyImageUrl ||
    selected?.faceImageUrl;

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
  }, [characterId]);

  async function generate() {
    if (!characterId) {
      setError("Escolha uma personagem na Biblioteca.");
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
      });
      setFullPrompt(r.fullPrompt);
      setMsg(
        kind === "image"
          ? "Prompt de imagem pronto — copie para gerar o still e usar no vídeo fora."
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

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Criação"
        subtitle="Monta o look em imagem. O app não grava vídeo — você copia o prompt e gera o vídeo em outra plataforma."
      />

      <div className="space-y-4">
        <Panel title="1 · Imagem para usar fora">
          <p className="mb-3 text-xs leading-5 text-[var(--muted)]">
            Gera prompt de still (ela vestida). Vídeo fica para o Flow ou outra
            plataforma.
          </p>
          <div className="flex gap-2">
            {(
              [
                ["image", "Imagem"],
                ["video", "Prompt de vídeo"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setKind(id)}
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

        <Panel title="3 · Peças desta cena">
          <div className="mb-4">
            <p className="mb-2 text-[13px] font-medium text-[var(--ink)]">
              Look — peça e ela vestida
            </p>
            {wardrobe.length === 0 && otherOutfits.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">
                Sem looks no banco. Cadastre a peça e a foto dela vestida na personagem.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setOutfitId("")}
                  className={`flex aspect-[3/4] items-center justify-center rounded-xl border text-xs ${
                    !outfitId
                      ? "border-[var(--accent)] bg-[var(--accent-soft)] font-medium"
                      : "border-dashed border-[var(--line)] text-[var(--muted)]"
                  }`}
                >
                  Nenhuma
                </button>
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
          </div>
          <Field label={kind === "image" ? "Pose / movimento" : "Movimento"}>
            <select
              className={inputClass}
              value={movementId}
              onChange={(e) => setMovementId(e.target.value)}
            >
              <option value="">—</option>
              {(selected?.movements || []).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </Field>
          <div className="mt-4">
            <p className="mb-2 text-[13px] font-medium text-[var(--ink)]">
              Cenário
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  setKeepSceneFromPhoto(true);
                  setSceneId("");
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
                    className="aspect-[3/4] w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-[3/4] items-center justify-center bg-[var(--panel-elevated)] px-3 text-center text-xs text-[var(--muted)]">
                    Sem foto ainda
                  </div>
                )}
                <p className="px-2 py-1.5 text-[11px] font-medium text-[var(--ink)]">
                  Usar o cenário da imagem dela
                </p>
              </button>
              {herScenes.map((s) => (
                <SceneCard
                  key={s.id}
                  scene={s}
                  selected={!keepSceneFromPhoto && sceneId === s.id}
                  onSelect={() => {
                    setKeepSceneFromPhoto(false);
                    setSceneId(s.id);
                  }}
                />
              ))}
              {otherScenes.map((s) => (
                <SceneCard
                  key={s.id}
                  scene={s}
                  selected={!keepSceneFromPhoto && sceneId === s.id}
                  onSelect={() => {
                    setKeepSceneFromPhoto(false);
                    setSceneId(s.id);
                  }}
                />
              ))}
            </div>
          </div>
          {selected && characterHasVoice(selected) ? (
            <label className="mt-3 flex items-center gap-2 text-sm text-[var(--ink)]">
              <input
                type="checkbox"
                checked={includeVoice}
                onChange={(e) => setIncludeVoice(e.target.checked)}
              />
              Incluir voz de {selected.voice?.name || selected.identity.displayName}
            </label>
          ) : null}
        </Panel>

        <Button
          className="w-full"
          loading={busy}
          disabled={!characterId}
          onClick={() => void generate()}
        >
          <WandSparkles size={16} />
          Gerar prompt de {kind === "image" ? "imagem" : "vídeo"}
        </Button>
        {error ? <p className="text-xs text-[var(--danger)]">{error}</p> : null}
        {msg ? (
          <p className="text-xs text-[var(--success-text)]">{msg}</p>
        ) : null}

        {fullPrompt ? (
          <Panel title="Resultado">
            <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-xl border border-[var(--line)] bg-[#0b0c10] p-3 text-[11px] leading-4 text-[var(--muted)]">
              {fullPrompt}
            </pre>
            <Button
              className="mt-3"
              variant="secondary"
              onClick={() =>
                void navigator.clipboard.writeText(fullPrompt).then(() =>
                  setMsg("Copiado."),
                )
              }
            >
              <Copy size={14} />
              Copiar
            </Button>
          </Panel>
        ) : null}

        {saved.length > 0 ? (
          <Panel title="Últimos">
            <ul className="space-y-1 text-sm">
              {saved.slice(0, 5).map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className="w-full rounded-lg px-2 py-2 text-left hover:bg-[var(--panel-elevated)]"
                    onClick={() => setFullPrompt(p.fullPrompt)}
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
