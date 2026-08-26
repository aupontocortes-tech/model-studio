"use client";

import { Suspense } from "react";
import GerarStudioPage from "./GerarClient";

export default function Page() {
  return (
    <Suspense fallback={<p className="text-sm text-[var(--muted)]">Carregando…</p>}>
      <GerarStudioPage />
    </Suspense>
  );
}
