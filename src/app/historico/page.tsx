"use client";

import { useEffect, useState } from "react";
import {
  Button,
  PageHeader,
  Panel,
} from "@/components/ui/primitives";
import { api } from "@/lib/clientApi";
import type { Generation } from "@/domain/types";

export default function HistoricoPage() {
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [busy, setBusy] = useState(false);

  async function load() {
    const { generations: list } = await api.generations.list();
    setGenerations(list);
  }

  useEffect(() => {
    void load();
  }, []);

  async function duplicate(id: string) {
    setBusy(true);
    try {
      await api.generations.patch(id, { action: "duplicate" });
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function vary(g: Generation) {
    setBusy(true);
    try {
      await api.generations.create({
        productId: g.productId,
        characterId: g.characterId,
        projectId: g.projectId,
        scenePresetId: g.config.scene.presetId,
        lockCharacter: g.config.lockCharacter,
        variationCount: 1,
        withSpeech: g.config.withSpeech,
        cta: g.config.cta,
        customCta: g.config.customCta,
        tiktokShop: g.config.tiktokShop,
        parentGenerationId: g.id,
      });
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Histórico"
        subtitle="Toda geração registra produto, personagem, prompts, config, provider e status."
      />
      <Panel>
        {generations.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">Sem gerações ainda.</p>
        ) : (
          <ul className="space-y-4">
            {generations.map((g) => (
              <li
                key={g.id}
                className="grid gap-3 border-b border-[var(--line)] pb-4 last:border-0 md:grid-cols-[96px_1fr_auto]"
              >
                {g.resultImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={g.resultImageUrl}
                    alt=""
                    className="h-28 w-20 rounded object-cover"
                  />
                ) : (
                  <div className="flex h-28 w-20 items-center justify-center rounded bg-black/5 text-[10px] text-[var(--muted)]">
                    n/a
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-medium">{g.id}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {new Date(g.createdAt).toLocaleString("pt-BR")} ·{" "}
                    {g.status} · {g.provider}
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    Produto {g.productId} · Personagem {g.characterId} · Cena{" "}
                    {g.config.scene.presetId}
                    {g.config.lockCharacter ? " · modelo travada" : ""}
                  </p>
                  {g.speechScript ? (
                    <p className="mt-2 text-sm">“{g.speechScript}”</p>
                  ) : null}
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    variant="secondary"
                    disabled={busy}
                    onClick={() => void duplicate(g.id)}
                  >
                    Duplicar
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={busy}
                    onClick={() => void vary(g)}
                  >
                    Criar variação
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
