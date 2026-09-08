"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Rota antiga: Comandos agora é um segmento dentro de Prompts. */
export default function ComandosRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/prompts");
  }, [router]);
  return (
    <p className="text-sm text-[var(--muted)]">Abrindo Prompts…</p>
  );
}
