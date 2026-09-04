"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Clapperboard, Library, LockKeyhole } from "lucide-react";
import GerarStudioPage from "./GerarClient";
import UgcAdvancedPage from "../criar/page";

export default function CriarUnifiedClient() {
  const router = useRouter();
  const search = useSearchParams();
  const advanced = search.get("mode") === "ugc";

  function setMode(mode: "studio" | "ugc") {
    const next = new URLSearchParams(search.toString());
    if (mode === "ugc") {
      next.set("mode", "ugc");
      next.set("kind", "video");
    } else {
      next.delete("mode");
    }
    const query = next.toString();
    router.replace(query ? `/gerar?${query}` : "/gerar");
  }

  return (
    <div>
      <section className="mx-auto mb-5 max-w-3xl rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-3">
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setMode("studio")}
            className={`flex items-start gap-3 rounded-xl border p-3 text-left transition ${
              !advanced
                ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                : "border-[var(--line)] bg-[var(--panel-elevated)] hover:border-[var(--accent)]"
            }`}
          >
            <Library
              size={19}
              className={advanced ? "text-[var(--muted)]" : "text-[var(--accent)]"}
            />
            <span>
              <span className="block text-sm font-semibold text-[var(--ink)]">
                Criar com a Biblioteca
              </span>
              <span className="mt-0.5 block text-[11px] leading-4 text-[var(--muted)]">
                Personagem, look e cenário já salvos.
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMode("ugc")}
            className={`flex items-start gap-3 rounded-xl border p-3 text-left transition ${
              advanced
                ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                : "border-[var(--line)] bg-[var(--panel-elevated)] hover:border-[var(--accent)]"
            }`}
          >
            <Clapperboard
              size={19}
              className={advanced ? "text-[var(--accent)]" : "text-[var(--muted)]"}
            />
            <span>
              <span className="block text-sm font-semibold text-[var(--ink)]">
                Vídeo avançado
              </span>
              <span className="mt-0.5 block text-[11px] leading-4 text-[var(--muted)]">
                Elenco, Kalodata, vídeo modelo, voz, CTA e takes.
              </span>
            </span>
          </button>
        </div>
        <p className="mt-2 flex items-center gap-1.5 px-1 text-[10px] text-[var(--muted)]">
          <LockKeyhole size={11} />
          Os dois modos mantêm seus dados e históricos atuais.
        </p>
      </section>

      {advanced ? <UgcAdvancedPage /> : <GerarStudioPage />}
    </div>
  );
}
