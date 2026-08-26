"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Button,
  Field,
  PageHeader,
  Panel,
  inputClass,
} from "@/components/ui/primitives";
import { LibraryTabs } from "@/components/studio/LibraryTabs";
import { SceneCard } from "@/components/studio/SceneCard";
import { api } from "@/lib/clientApi";
import { sceneLabel, type StudioCharacter, type StudioScene } from "@/domain/studioAssets";
import { Trash2, Upload } from "lucide-react";

export default function CenariosPage() {
  const [scenes, setScenes] = useState<StudioScene[]>([]);
  const [characters, setCharacters] = useState<StudioCharacter[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [lighting, setLighting] = useState("");
  const [newName, setNewName] = useState("");
  const [newPrompt, setNewPrompt] = useState("");
  const [attachTo, setAttachTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const placeRef = useRef<HTMLInputElement>(null);
  const inSceneRef = useRef<HTMLInputElement>(null);
  const replacePlaceRef = useRef<HTMLInputElement>(null);
  const replaceInRef = useRef<HTMLInputElement>(null);

  const selected = scenes.find((s) => s.id === selectedId);

  const reload = useCallback(async () => {
    const [s, c] = await Promise.all([
      api.studio.scenes.list(),
      api.studio.characters.list(),
    ]);
    setScenes(s.scenes);
    setCharacters(c.characters);
    if (!selectedId && s.scenes[0]) setSelectedId(s.scenes[0].id);
  }, [selectedId]);

  useEffect(() => {
    void reload().catch((e) =>
      setError(e instanceof Error ? e.message : "Erro"),
    );
  }, [reload]);

  useEffect(() => {
    if (!selected) return;
    setName(selected.name);
    setDescription(selected.description);
    setLighting(selected.lighting || "");
  }, [selected]);

  const pinnedBy = characters.filter((c) => c.sceneIds.includes(selectedId));

  async function run(fn: () => Promise<void>, ok?: string) {
    setBusy(true);
    setError("");
    try {
      await fn();
      await reload();
      if (ok) setMsg(ok);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Biblioteca de cenários"
        subtitle="Por foto: o lugar e, se tiver, ela já nesse lugar. Nome opcional."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => placeRef.current?.click()} loading={busy}>
              <Upload size={16} />
              Foto do lugar
            </Button>
            <Button
              variant="secondary"
              onClick={() => inSceneRef.current?.click()}
              loading={busy}
            >
              <Upload size={16} />
              Ela no cenário
            </Button>
          </div>
        }
      />
      <LibraryTabs />

      <input
        ref={placeRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          void run(async () => {
            const { scene } = await api.studio.scenes.upload(f, {
              name: newName.trim() || undefined,
              description: newPrompt.trim() || undefined,
              slot: "place",
            });
            setNewName("");
            setNewPrompt("");
            setSelectedId(scene.id);
          }, "Cenário criado pela foto do lugar.");
        }}
      />
      <input
        ref={inSceneRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          void run(async () => {
            const { scene } = await api.studio.scenes.upload(f, {
              name: newName.trim() || undefined,
              description: newPrompt.trim() || undefined,
              slot: "inScene",
            });
            setNewName("");
            setNewPrompt("");
            setSelectedId(scene.id);
          }, "Cenário criado com ela no lugar.");
        }}
      />

      <div className="mb-4 grid gap-2 sm:grid-cols-2">
        <input
          className={inputClass}
          placeholder="Nome (opcional)"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <input
          className={inputClass}
          placeholder="Prompt (opcional)"
          value={newPrompt}
          onChange={(e) => setNewPrompt(e.target.value)}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <Panel title="Cenários">
          {scenes.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">Nenhum ainda.</p>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {scenes.map((s) => (
                <SceneCard
                  key={s.id}
                  scene={s}
                  selected={s.id === selectedId}
                  onSelect={() => setSelectedId(s.id)}
                />
              ))}
            </div>
          )}
        </Panel>

        {!selected ? (
          <Panel title="Selecione">
            <p className="text-sm text-[var(--muted)]">
              Escolha um cenário ou envie uma foto.
            </p>
          </Panel>
        ) : (
          <div className="space-y-4">
            <Panel title="Lugar e ela no cenário">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="mb-1.5 text-[11px] font-medium text-[var(--muted)]">
                    Lugar
                  </p>
                  {selected.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={selected.imageUrl}
                      alt="Lugar"
                      className="mb-2 aspect-[3/4] w-full rounded-xl object-cover"
                    />
                  ) : (
                    <div className="mb-2 flex aspect-[3/4] items-center justify-center rounded-xl border border-dashed border-[var(--line)] text-sm text-[var(--muted)]">
                      Sem lugar
                    </div>
                  )}
                  <Button
                    variant="secondary"
                    onClick={() => replacePlaceRef.current?.click()}
                  >
                    <Upload size={14} />
                    {selected.imageUrl ? "Trocar lugar" : "Enviar lugar"}
                  </Button>
                </div>
                <div>
                  <p className="mb-1.5 text-[11px] font-medium text-[var(--muted)]">
                    Ela no cenário
                  </p>
                  {selected.inSceneImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={selected.inSceneImageUrl}
                      alt={sceneLabel(selected)}
                      className="mb-2 aspect-[3/4] w-full rounded-xl object-cover"
                    />
                  ) : (
                    <div className="mb-2 flex aspect-[3/4] items-center justify-center rounded-xl border border-dashed border-[var(--line)] text-sm text-[var(--muted)]">
                      Sem ela no lugar
                    </div>
                  )}
                  <Button
                    variant="secondary"
                    onClick={() => replaceInRef.current?.click()}
                  >
                    <Upload size={14} />
                    {selected.inSceneImageUrl
                      ? "Trocar ela no lugar"
                      : "Enviar ela no lugar"}
                  </Button>
                </div>
              </div>
              <input
                ref={replacePlaceRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (!f) return;
                  void run(async () => {
                    await api.studio.scenes.upload(f, {
                      sceneId: selectedId,
                      slot: "place",
                    });
                  }, "Foto do lugar atualizada.");
                }}
              />
              <input
                ref={replaceInRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (!f) return;
                  void run(async () => {
                    await api.studio.scenes.upload(f, {
                      sceneId: selectedId,
                      slot: "inScene",
                    });
                  }, "Foto dela no cenário atualizada.");
                }}
              />
            </Panel>

            <Panel title="Detalhes (opcional)">
              <div className="space-y-3">
                <Field label="Nome" hint="Pode deixar em branco">
                  <input
                    className={inputClass}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Opcional"
                  />
                </Field>
                <Field label="Prompt">
                  <textarea
                    className={inputClass}
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </Field>
                <Field label="Luz" hint="Opcional">
                  <input
                    className={inputClass}
                    value={lighting}
                    onChange={(e) => setLighting(e.target.value)}
                  />
                </Field>
                <Button
                  loading={busy}
                  onClick={() =>
                    void run(async () => {
                      await api.studio.scenes.update(selectedId, {
                        name,
                        description,
                        lighting,
                      });
                    }, "Cenário salvo.")
                  }
                >
                  Salvar
                </Button>
              </div>
            </Panel>

            <Panel title="Personagens com este cenário">
              {pinnedBy.length === 0 ? (
                <p className="mb-3 text-sm text-[var(--muted)]">
                  Nenhuma personagem pinçou ainda.
                </p>
              ) : (
                <ul className="mb-3 space-y-1 text-sm">
                  {pinnedBy.map((c) => (
                    <li key={c.id}>{c.identity.displayName}</li>
                  ))}
                </ul>
              )}
              <div className="flex flex-wrap gap-2">
                <select
                  className={`${inputClass} flex-1`}
                  value={attachTo}
                  onChange={(e) => setAttachTo(e.target.value)}
                >
                  <option value="">Ligar a personagem…</option>
                  {characters
                    .filter((c) => !c.sceneIds.includes(selectedId))
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.identity.displayName}
                      </option>
                    ))}
                </select>
                <Button
                  variant="secondary"
                  disabled={!attachTo}
                  onClick={() =>
                    void run(async () => {
                      await api.studio.characters.update(attachTo, {
                        addSceneId: selectedId,
                      });
                      setAttachTo("");
                    }, "Cenário ligado a ela.")
                  }
                >
                  Adicionar
                </Button>
              </div>
            </Panel>

            <Button
              variant="danger"
              onClick={() =>
                void run(async () => {
                  await api.studio.scenes.remove(selectedId);
                  setSelectedId("");
                }, "Cenário apagado da biblioteca.")
              }
            >
              <Trash2 size={14} />
              Excluir da biblioteca
            </Button>
            {msg ? (
              <p className="text-xs text-[var(--success-text)]">{msg}</p>
            ) : null}
            {error ? (
              <p className="text-xs text-[var(--danger)]">{error}</p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
