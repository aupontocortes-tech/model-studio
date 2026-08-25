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
import type { Project } from "@/domain/types";

export default function ProjetosPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const { projects: list } = await api.projects.list();
    setProjects(list);
  }

  useEffect(() => {
    void load();
  }, []);

  async function create() {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await api.projects.create({ name: name.trim(), description });
      setName("");
      setDescription("");
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Projetos"
        subtitle="Cada campanha TikTok Shop pode ser um projeto: produto, personagem, imagens, vídeos e prompts."
      />
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Panel title="Novo projeto">
          <div className="space-y-3">
            <Field label="Nome">
              <input
                className={inputClass}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <Field label="Descrição">
              <textarea
                className={inputClass}
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Field>
            <Button disabled={busy} onClick={() => void create()}>
              Criar projeto
            </Button>
          </div>
        </Panel>
        <Panel title="Lista">
          {projects.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">Nenhum projeto.</p>
          ) : (
            <ul className="space-y-3">
              {projects.map((p) => (
                <li
                  key={p.id}
                  className="border-b border-[var(--line)] pb-3 last:border-0"
                >
                  <p className="font-medium">{p.name}</p>
                  <p className="text-sm text-[var(--muted)]">
                    {p.description || "Sem descrição"}
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {p.productIds.length} produtos · {p.characterIds.length}{" "}
                    modelos · {p.generationIds.length} gerações
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
