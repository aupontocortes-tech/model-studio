"use client";

import { useEffect, useState } from "react";
import {
  Button,
  PageHeader,
  Panel,
} from "@/components/ui/primitives";
import { api } from "@/lib/clientApi";
import { Bot, Copy, ExternalLink } from "lucide-react";

export default function ConfiguracoesPage() {
  const [flowUrl, setFlowUrl] = useState("");
  const [tokfyUrl, setTokfyUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [claudeMsg, setClaudeMsg] = useState("");

  useEffect(() => {
    void api.meta().then((m) => {
      setFlowUrl(m.googleFlowUrl);
      setTokfyUrl(m.tokfyUrl || "https://tokfy.ai/app/inicio");
    });
  }, []);

  async function copyText(label: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setClaudeMsg(`${label} copiado — cole no Claude.`);
    } catch {
      setClaudeMsg("Falha ao copiar. Abra /api/claude-brief?mode=prompt no navegador.");
    }
  }

  async function copyClaudePrompt() {
    setBusy(true);
    setClaudeMsg("");
    try {
      const data = await api.claudeBrief({ mode: "prompt" });
      await copyText(
        "Prompt mestre",
        data.prompt || data.systemPrompt || "",
      );
    } catch (e) {
      setClaudeMsg(e instanceof Error ? e.message : "Falha ao buscar prompt");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Claude + ferramentas"
        subtitle="Configure uma vez. Depois só use Enviar para Claude em Criação."
      />

      <div className="space-y-4">
        <Panel title="Como funciona">
          <ol className="list-decimal space-y-2 pl-4 text-sm leading-6 text-[var(--muted)]">
            <li>
              Copie o <strong>prompt mestre</strong> abaixo e cole nas instruções
              do Claude Desktop (Computer Use).
            </li>
            <li>
              No app: monte personagem + look em <strong>Biblioteca</strong>, vá
              em <strong>Criação</strong> e clique <strong>Enviar para Claude</strong>.
            </li>
            <li>
              Cole o pacote no Claude. Ele abre <strong>Tokfy</strong>, Flow ou
              outra ferramenta que você indicar e gera foto/vídeo.
            </li>
          </ol>
        </Panel>

        <Panel title="1 · Prompt mestre (uma vez)">
          <Button loading={busy} onClick={() => void copyClaudePrompt()}>
            <Bot size={16} />
            Copiar prompt mestre Claude
          </Button>
          {claudeMsg ? (
            <p className="mt-3 rounded-xl bg-[var(--accent-soft)] px-3 py-2 text-xs leading-5 text-[#4930b5]">
              {claudeMsg}
            </p>
          ) : null}
        </Panel>

        <Panel title="2 · Ferramentas que o Claude pode usar">
          <ul className="space-y-2 text-sm">
            <li>
              <a
                href={tokfyUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[var(--accent)]"
              >
                Tokfy — vídeo + ChatGPT ilimitado <ExternalLink size={12} />
              </a>
            </li>
            <li>
              <a
                href={flowUrl || "https://flow.google/"}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[var(--accent)]"
              >
                Google Flow <ExternalLink size={12} />
              </a>
            </li>
          </ul>
          <p className="mt-3 text-xs text-[var(--muted)]">
            Qualquer outra ferramenta: diga no chat do Claude ou escolha em
            Criação → Onde o Claude deve gerar.
          </p>
        </Panel>

        <Panel title="3 · Pacote de trabalho">
          <p className="mb-3 text-sm text-[var(--muted)]">
            Cada geração copia um pacote com prompt, fotos e passos. O Model
            Studeo monta; o Claude executa.
          </p>
          <a
            href="/gerar"
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--panel-elevated)] px-4 py-2 text-sm font-semibold text-[var(--ink)] hover:border-[var(--accent)]"
          >
            <Copy size={14} />
            Ir para Criação
          </a>
        </Panel>
      </div>
    </div>
  );
}
