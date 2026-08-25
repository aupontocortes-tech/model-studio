"use client";

import { useEffect, useState } from "react";
import {
  Button,
  Field,
  PageHeader,
  Panel,
  inputClass,
} from "@/components/ui/primitives";
import { api } from "@/lib/clientApi";
import type { Character } from "@/domain/types";

export default function ModelosPage() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [name, setName] = useState("");
  const [autoGenerate, setAutoGenerate] = useState(true);
  const [lockIdentity, setLockIdentity] = useState(false);
  const [busy, setBusy] = useState(false);

  async function load() {
    const { characters: list } = await api.characters.list();
    setCharacters(list);
  }

  useEffect(() => {
    void load();
  }, []);

  async function create() {
    setBusy(true);
    try {
      await api.characters.create({
        name: name.trim() || "Modelo",
        autoGenerate,
        lockIdentity,
      });
      setName("");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function reuse(id: string, lock: boolean) {
    await api.characters.update(id, { lockIdentity: lock });
    await load();
  }

  async function randomize(id: string) {
    await api.characters.update(id, { randomize: true, lockIdentity: false });
    await load();
  }

  return (
    <div>
      <PageHeader
        title="Modelos"
        subtitle="Personagens com CharacterProfile. Identidade é travada pelo perfil, não só pelo nome."
      />
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Panel title="Nova personagem">
          <div className="space-y-3">
            <Field label="Nome interno">
              <input
                className={inputClass}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={autoGenerate}
                onChange={(e) => setAutoGenerate(e.target.checked)}
              />
              Gerar características automaticamente
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={lockIdentity}
                onChange={(e) => setLockIdentity(e.target.checked)}
              />
              Manter esta modelo
            </label>
            <Button disabled={busy} onClick={() => void create()}>
              Criar
            </Button>
          </div>
        </Panel>
        <Panel title="Biblioteca">
          {characters.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">Nenhuma personagem.</p>
          ) : (
            <ul className="space-y-4">
              {characters.map((c) => (
                <li
                  key={c.id}
                  className="border-b border-[var(--line)] pb-4 last:border-0"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{c.name}</p>
                      <p className="text-xs text-[var(--muted)]">{c.id}</p>
                      <p className="mt-2 text-sm text-[var(--muted)]">
                        {c.profile.apparentAge} anos aparentes ·{" "}
                        {c.profile.skinTone} · {c.profile.hairColor}{" "}
                        {c.profile.hairLength} · {c.profile.bodyType}
                      </p>
                      <p className="text-xs text-[var(--muted)]">
                        Lock: {c.lockIdentity ? "ativo" : "off"} · Gerações:{" "}
                        {c.generationIds.length}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => void reuse(c.id, true)}
                      >
                        Usar novamente
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => void randomize(c.id)}
                      >
                        Nova aleatória
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
