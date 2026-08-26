"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Clapperboard,
  LayoutDashboard,
  Plus,
  Settings2,
  Sparkles,
  UserRound,
} from "lucide-react";
import { api } from "@/lib/clientApi";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

const NAV = [
  { href: "/gerar", label: "Criar", icon: Sparkles },
  { href: "/personagens", label: "Biblioteca", icon: UserRound },
  { href: "/criar", label: "UGC vídeo", icon: Clapperboard },
  { href: "/", label: "Início", icon: LayoutDashboard },
  { href: "/configuracoes", label: "Ajustes", icon: Settings2 },
];

function navActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/personagens") {
    return (
      pathname.startsWith("/personagens") ||
      pathname.startsWith("/roupas") ||
      pathname.startsWith("/cenarios")
    );
  }
  return pathname.startsWith(href);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [provider, setProvider] = useState("mock");

  useEffect(() => {
    void api.meta()
      .then((m) => setProvider(m.provider))
      .catch(() => undefined);
  }, []);

  const providerLabel =
    provider === "browser-agent" || provider === "browser" || provider === "flow"
      ? "Agente no navegador"
      : provider === "mock"
        ? "Modo mock ativo"
        : `Provider: ${provider}`;

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="relative z-20 border-b border-white/10 bg-[var(--sidebar)] text-[var(--sidebar-text)] lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between px-5 py-5 lg:px-6 lg:py-7">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent)] shadow-[0_8px_20px_rgba(109,74,255,0.35)]">
              <Sparkles size={18} strokeWidth={2.2} />
            </span>
            <span>
              <span className="block text-[17px] font-bold tracking-[-0.04em]">
                Model Studeo
              </span>
              <span className="block text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--sidebar-muted)]">
                AI Studio
              </span>
            </span>
          </Link>
          <Link
            href="/gerar"
            aria-label="Criar"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white lg:hidden"
          >
            <Plus size={18} />
          </Link>
        </div>
        <div className="hidden px-4 lg:block">
          <Link
            href="/gerar"
            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] text-sm font-semibold text-white shadow-[0_8px_24px_rgba(109,74,255,0.28)] transition hover:bg-[var(--accent-hover)]"
          >
            <Plus size={17} strokeWidth={2.5} />
            Nova criação
          </Link>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-4 lg:mt-7 lg:flex-col lg:overflow-visible lg:px-4">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = navActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-3 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-white/[0.09] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]"
                    : "text-[var(--sidebar-muted)] hover:bg-white/[0.05] hover:text-white"
                }`}
              >
                <Icon
                  size={18}
                  strokeWidth={active ? 2.2 : 1.8}
                  className={active ? "text-[#a995ff]" : "transition group-hover:text-white"}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto hidden p-4 lg:block">
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.04] p-3.5">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_0_4px_rgba(52,211,153,0.1)]" />
              <span className="text-xs font-semibold text-white">{providerLabel}</span>
            </div>
            <p className="mt-2 text-[11px] leading-4 text-[var(--sidebar-muted)]">
              Fidelidade do produto sempre tem prioridade.
            </p>
          </div>
          <Link
            href="/configuracoes"
            className={`mt-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
              pathname.startsWith("/configuracoes")
                ? "bg-white/[0.09] text-white"
                : "text-[var(--sidebar-muted)] hover:bg-white/[0.05] hover:text-white"
            }`}
          >
            <Settings2 size={18} />
            Configurações
          </Link>
        </div>
      </aside>
      <main className="min-w-0 px-4 py-6 sm:px-6 lg:px-8 lg:py-8 xl:px-10">
        <div className="mx-auto mb-4 flex justify-end">
          <ThemeToggle />
        </div>
        <div className="mx-auto w-full max-w-[1600px]">{children}</div>
      </main>
    </div>
  );
}
