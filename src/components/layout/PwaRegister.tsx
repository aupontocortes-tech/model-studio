"use client";

import { useEffect, useState } from "react";
import { Download, Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/primitives";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (navigator as any).standalone === true
  );
}

export function PwaRegister() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [showIosHint, setShowIosHint] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }

    if (isStandalone()) return;

    const onInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", onInstall);
    return () => window.removeEventListener("beforeinstallprompt", onInstall);
  }, []);

  useEffect(() => {
    if (isStandalone() || dismissed) return;
    try {
      if (localStorage.getItem("pwa-banner-dismissed") === "1") {
        setDismissed(true);
      }
    } catch {
      /* ignore */
    }
  }, [dismissed]);

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem("pwa-banner-dismissed", "1");
    } catch {
      /* ignore */
    }
  }

  async function installAndroid() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    dismiss();
  }

  if (isStandalone() || dismissed) return null;

  const showAndroid = Boolean(deferred);
  const showIos = isIos() && !showAndroid;

  if (!showAndroid && !showIos) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-lg rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4 shadow-xl sm:left-auto sm:right-6">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
          <Smartphone size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[var(--ink)]">
            Instalar Model Studeo
          </p>
          {showAndroid ? (
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
              Adicione à tela inicial do Android como app.
            </p>
          ) : (
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
              No Safari: toque em <strong>Compartilhar</strong> →{" "}
              <strong>Adicionar à Tela de Início</strong>.
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {showAndroid ? (
              <Button onClick={() => void installAndroid()}>
                <Download size={14} />
                Instalar app
              </Button>
            ) : (
              <Button variant="secondary" onClick={() => setShowIosHint(true)}>
                Ver passo a passo
              </Button>
            )}
            <Button variant="secondary" onClick={dismiss}>
              Agora não
            </Button>
          </div>
          {showIosHint ? (
            <ol className="mt-3 list-decimal space-y-1 pl-4 text-[11px] leading-5 text-[var(--muted)]">
              <li>Abra este site no Safari</li>
              <li>Toque no ícone Compartilhar (quadrado com seta)</li>
              <li>Role e toque em Adicionar à Tela de Início</li>
              <li>Confirme — o ícone roxo &quot;M&quot; aparece na home</li>
            </ol>
          ) : null}
        </div>
        <button
          type="button"
          aria-label="Fechar"
          onClick={dismiss}
          className="rounded-lg p-1 text-[var(--muted)] hover:bg-[var(--panel-elevated)]"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
