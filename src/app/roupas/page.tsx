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
import { OutfitCard } from "@/components/studio/OutfitCard";
import { api } from "@/lib/clientApi";
import { type StudioCharacter, type StudioOutfit } from "@/domain/studioAssets";
import { Trash2, Upload } from "lucide-react";

export default function RoupasPage() {
  const [outfits, setOutfits] = useState<StudioOutfit[]>([]);
  const [characters, setCharacters] = useState<StudioCharacter[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [colors, setColors] = useState("");
  const [newName, setNewName] = useState("");
  const [newPrompt, setNewPrompt] = useState("");
  const [attachTo, setAttachTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const photoRef = useRef<HTMLInputElement>(null);
  const wornNewRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);
  const replaceWornRef = useRef<HTMLInputElement>(null);

  const selected = outfits.find((o) => o.id === selectedId);

  const reload = useCallback(async () => {
    const [o, c] = await Promise.all([
      api.studio.outfits.list(),
      api.studio.characters.list(),
    ]);
    setOutfits(o.outfits);
    setCharacters(c.characters);
    if (!selectedId && o.outfits[0]) setSelectedId(o.outfits[0].id);
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
    setColors(selected.colors || "");
  }, [selected]);

  const wearing = characters.filter((c) =>
    c.outfitIds.includes(selectedId),
  );

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
        title="Biblioteca de roupas"
        subtitle="Peça separada + ela vestida. Só imagem — vídeo é em outra plataforma."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => photoRef.current?.click()} loading={busy}>
              <Upload size={16} />
              Foto da peça
            </Button>
            <Button
              variant="secondary"
              onClick={() => wornNewRef.current?.click()}
              loading={busy}
            >
              <Upload size={16} />
              Ela vestida
            </Button>
          </div>
        }
      />
      <LibraryTabs />

      <input
        ref={photoRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          void run(async () => {
            const { outfit } = await api.studio.outfits.upload(f, {
              name: newName.trim() || undefined,
              description: newPrompt.trim() || undefined,
              slot: "piece",
            });
            setNewName("");
            setNewPrompt("");
            setSelectedId(outfit.id);
          }, "Roupa criada pela foto.");
        }}
      />

      <input
        ref={wornNewRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          void run(async () => {
            const { outfit } = await api.studio.outfits.upload(f, {
              name: newName.trim() || undefined,
              description: newPrompt.trim() || undefined,
              slot: "worn",
            });
            setNewName("");
            setNewPrompt("");
            setSelectedId(outfit.id);
          }, "Look criado com ela vestida.");
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

      <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
        <Panel title="Roupas">
          {outfits.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">Nenhuma ainda.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {outfits.map((o) => (
                <OutfitCard
                  key={o.id}
                  outfit={o}
                  selected={o.id === selectedId}
                  onSelect={() => setSelectedId(o.id)}
                />
              ))}
            </div>
          )}
        </Panel>

        {!selected ? (
          <Panel title="Selecione">
            <p className="text-sm text-[var(--muted)]">
              Escolha uma roupa ou crie acima.
            </p>
          </Panel>
        ) : (
          <div className="space-y-4">
            <Panel title="Peça e ela vestida">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="mb-1.5 text-[11px] font-medium text-[var(--muted)]">
                    Peça (roupa separada)
                  </p>
                  {selected.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={selected.imageUrl}
                      alt="Peça"
                      className="mb-2 aspect-[3/4] w-full rounded-xl object-cover"
                    />
                  ) : (
                    <div className="mb-2 flex aspect-[3/4] items-center justify-center rounded-xl border border-dashed border-[var(--line)] text-sm text-[var(--muted)]">
                      Sem peça
                    </div>
                  )}
                  <Button
                    variant="secondary"
                    onClick={() => replaceRef.current?.click()}
                  >
                    <Upload size={14} />
                    {selected.imageUrl ? "Trocar peça" : "Enviar peça"}
                  </Button>
                </div>
                <div>
                  <p className="mb-1.5 text-[11px] font-medium text-[var(--muted)]">
                    Ela vestida
                  </p>
                  {selected.wornImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={selected.wornImageUrl}
                      alt="Ela vestida"
                      className="mb-2 aspect-[3/4] w-full rounded-xl object-cover"
                    />
                  ) : (
                    <div className="mb-2 flex aspect-[3/4] items-center justify-center rounded-xl border border-dashed border-[var(--line)] text-sm text-[var(--muted)]">
                      Sem foto dela vestida
                    </div>
                  )}
                  <Button
                    variant="secondary"
                    onClick={() => replaceWornRef.current?.click()}
                  >
                    <Upload size={14} />
                    {selected.wornImageUrl ? "Trocar vestida" : "Enviar vestida"}
                  </Button>
                </div>
              </div>
              <input
                ref={replaceRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (!f) return;
                  void run(async () => {
                    await api.studio.outfits.upload(f, {
                      outfitId: selectedId,
                      slot: "piece",
                    });
                  }, "Foto da peça atualizada.");
                }}
              />
              <input
                ref={replaceWornRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (!f) return;
                  void run(async () => {
                    await api.studio.outfits.upload(f, {
                      outfitId: selectedId,
                      slot: "worn",
                    });
                  }, "Foto dela vestida atualizada.");
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
                <Field label="Cores" hint="Opcional">
                  <input
                    className={inputClass}
                    value={colors}
                    onChange={(e) => setColors(e.target.value)}
                  />
                </Field>
                <Button
                  loading={busy}
                  onClick={() =>
                    void run(async () => {
                      await api.studio.outfits.update(selectedId, {
                        name,
                        description,
                        colors,
                      });
                    }, "Roupa salva.")
                  }
                >
                  Salvar
                </Button>
              </div>
            </Panel>

            <Panel
              title="Quem veste"
              description="A mesma roupa pode ir para várias personagens."
            >
              {wearing.length === 0 ? (
                <p className="mb-3 text-sm text-[var(--muted)]">
                  Nenhuma personagem ainda.
                </p>
              ) : (
                <ul className="mb-3 space-y-1 text-sm">
                  {wearing.map((c) => (
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
                  <option value="">Jogar para personagem…</option>
                  {characters
                    .filter((c) => !c.outfitIds.includes(selectedId))
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
                        addOutfitId: selectedId,
                      });
                      setAttachTo("");
                    }, "Roupa no guarda-roupa dela.")
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
                  await api.studio.outfits.remove(selectedId);
                  setSelectedId("");
                }, "Roupa apagada da biblioteca.")
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
