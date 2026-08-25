"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Button,
  Field,
  PageHeader,
  Panel,
  inputClass,
} from "@/components/ui/primitives";
import { api } from "@/lib/clientApi";
import type { Product } from "@/domain/types";

export default function ProdutosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const { products: list } = await api.products.list();
    setProducts(list);
  }

  useEffect(() => {
    void load();
  }, []);

  async function create() {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await api.products.create({ name: name.trim(), category });
      setName("");
      setCategory("");
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Produtos"
        subtitle="Biblioteca de produtos com imagens, ProductSpec e atributos confirmados."
      />
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Panel title="Novo produto">
          <div className="space-y-3">
            <Field label="Nome">
              <input
                className={inputClass}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <Field label="Categoria">
              <input
                className={inputClass}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </Field>
            <Button disabled={busy} onClick={() => void create()}>
              Salvar
            </Button>
            <Link href="/criar" className="block text-sm text-[var(--accent)]">
              Ou continue no fluxo Criar →
            </Link>
          </div>
        </Panel>
        <Panel title="Biblioteca">
          {products.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">Nenhum produto.</p>
          ) : (
            <ul className="space-y-3">
              {products.map((p) => (
                <li
                  key={p.id}
                  className="flex gap-3 border-b border-[var(--line)] pb-3 last:border-0"
                >
                  {p.references[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.references[0].url}
                      alt=""
                      className="h-16 w-12 rounded object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-12 items-center justify-center rounded bg-black/5 text-[10px] text-[var(--muted)]">
                      sem foto
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {p.category || "sem categoria"} · {p.references.length}{" "}
                      refs · {p.spec.main_color || "cor n/d"}
                    </p>
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
