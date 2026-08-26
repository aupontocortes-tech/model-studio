"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader, Panel } from "@/components/ui/primitives";
import { api } from "@/lib/clientApi";
import type { Generation } from "@/domain/types";
import {
  ArrowRight,
  Boxes,
  Clock3,
  FolderKanban,
  ImagePlus,
  LockKeyhole,
  Sparkles,
  UserRound,
  WandSparkles,
} from "lucide-react";

export default function DashboardPage() {
  const [stats, setStats] = useState({
    projects: 0,
    products: 0,
    characters: 0,
    generations: 0,
    provider: "mock",
  });
  const [recent, setRecent] = useState<Generation[]>([]);

  useEffect(() => {
    void (async () => {
      const [projects, products, characters, generations, meta] =
        await Promise.all([
          api.projects.list(),
          api.products.list(),
          api.characters.list(),
          api.generations.list(),
          api.meta(),
        ]);
      setStats({
        projects: projects.projects.length,
        products: products.products.length,
        characters: characters.characters.length,
        generations: generations.generations.length,
        provider: meta.provider,
      });
      setRecent(generations.generations.slice(0, 5));
    })();
  }, []);

  const cards = [
    {
      label: "Projetos",
      value: stats.projects,
      href: "/projetos",
      icon: FolderKanban,
      color: "bg-violet-50 text-violet-600",
    },
    {
      label: "Produtos",
      value: stats.products,
      href: "/produtos",
      icon: Boxes,
      color: "bg-orange-50 text-orange-600",
    },
    {
      label: "Modelos",
      value: stats.characters,
      href: "/modelos",
      icon: UserRound,
      color: "bg-pink-50 text-pink-600",
    },
    {
      label: "Gerações",
      value: stats.generations,
      href: "/historico",
      icon: WandSparkles,
      color: "bg-emerald-50 text-emerald-600",
    },
  ];

  return (
    <div>
      <PageHeader
        title="Visão geral"
        subtitle="Studio criativo: identidade fixa + prompts para Flow/Veo · e o fluxo UGC de produto."
      />

      <section className="relative mb-5 overflow-hidden rounded-3xl bg-[var(--panel)] px-6 py-7 text-[var(--ink)] shadow-[0_24px_60px_rgba(17,19,26,0.08)] ring-1 ring-[var(--line)] sm:px-8 sm:py-9">
        <div className="absolute -right-24 -top-28 h-72 w-72 rounded-full bg-[var(--accent)] opacity-20 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-24 w-24 rounded-full bg-[#ff6b45] opacity-15 blur-2xl" />
        <div className="relative z-10 max-w-xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--panel-elevated)] px-3 py-1.5 text-[11px] font-semibold text-[var(--muted)]">
            <Sparkles size={13} className="text-[var(--accent)]" />
            MODEL STUDEO
          </span>
          <h2 className="mt-5 text-3xl font-bold leading-tight tracking-[-0.045em] sm:text-[40px]">
            Personagem travada. Cena livre.
          </h2>
          <p className="mt-3 max-w-lg text-sm leading-6 text-[var(--muted)]">
            Cadastre identidade (rosto, cabelo, olhos, pele, corpo, personalidade),
            combine roupa/cenário/movimento/roteiro e gere o prompt de diretor
            criativo — sem reinventar o rosto.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/gerar"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--accent)] px-5 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(109,74,255,0.3)] transition hover:bg-[var(--accent-hover)]"
            >
              <WandSparkles size={17} />
              Abrir gerador
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/criar"
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--panel-elevated)] px-5 text-sm font-semibold text-[var(--ink)]"
            >
              Fluxo UGC (avatar + roupa)
            </Link>
          </div>
        </div>
        <div className="absolute bottom-7 right-8 hidden rounded-2xl border border-[var(--line)] bg-[var(--panel-elevated)] p-4 backdrop-blur lg:block">
          <LockKeyhole size={20} className="text-[var(--accent)]" />
          <p className="mt-3 text-xs font-semibold">Product Lock</p>
          <p className="mt-1 max-w-[180px] text-[11px] leading-4 text-[var(--muted)]">
            Cor, corte, textura e detalhes sempre preservados.
          </p>
        </div>
      </section>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.label} href={c.href}>
            <Panel className="group transition-all hover:-translate-y-0.5 hover:border-[#cacdd7] hover:shadow-[0_12px_30px_rgba(16,24,40,0.08)]">
              <div className="flex items-center justify-between">
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${c.color}`}>
                  <c.icon size={19} />
                </span>
                <ArrowRight
                  size={16}
                  className="text-[#c0c2ca] transition group-hover:translate-x-0.5 group-hover:text-[var(--accent)]"
                />
              </div>
              <p className="mt-5 text-3xl font-bold tracking-[-0.04em]">{c.value}</p>
              <p className="mt-1 text-xs font-medium text-[var(--muted)]">{c.label}</p>
            </Panel>
          </Link>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
      <Panel
          title="Como funciona"
          description="Simples e direto — o agente orquestra."
        >
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ["01", "Avatar", "Envie a foto dela. Se já estiver no cenário, marque."],
              ["02", "Produto", "Suas fotos ou indique no Kalodata."],
              ["03", "Vídeo", "Um clique — imagem, cena e fala prontas."],
            ].map(([number, title, text]) => (
              <div key={number} className="rounded-xl border border-[var(--line)] bg-[#fafafe] p-3.5">
                <span className="text-[10px] font-bold tracking-wider text-[var(--accent)]">{number}</span>
                <p className="mt-1 text-sm font-semibold">{title}</p>
                <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{text}</p>
              </div>
            ))}
          </div>
        </Panel>

      <Panel title="Atividade recente" description={`Provider ativo: ${stats.provider}`}>
        {recent.length === 0 ? (
          <div className="flex min-h-52 flex-col items-center justify-center rounded-xl border border-dashed border-[var(--line)] bg-[#fafafe] px-6 text-center">
            <Clock3 size={22} className="text-[#b1b4bf]" />
            <p className="mt-3 text-sm font-semibold">Nenhuma geração ainda</p>
            <p className="mt-1 text-xs text-[var(--muted)]">Suas criações recentes aparecerão aqui.</p>
          </div>
        ) : (
          <ul className="space-y-1">
            {recent.map((g) => (
              <li
                key={g.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl px-2 py-3 text-sm transition hover:bg-[#f7f7fa]"
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
                    <WandSparkles size={16} />
                  </span>
                  <span>
                    <span className="block max-w-36 truncate text-xs font-semibold">{g.id}</span>
                    <span className="text-[10px] text-[var(--muted)]">{g.provider}</span>
                  </span>
                </span>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold capitalize text-emerald-700">
                  {g.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      </div>
    </div>
  );
}
