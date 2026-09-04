"use client";

import { Suspense } from "react";
import CriarUnifiedClient from "./CriarUnifiedClient";

export default function Page() {
  return (
    <Suspense fallback={<p className="text-sm text-[var(--muted)]">Carregando…</p>}>
      <CriarUnifiedClient />
    </Suspense>
  );
}
