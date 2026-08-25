"use client";

import { useEffect, useState } from "react";
import {
  Button,
  PageHeader,
  Panel,
} from "@/components/ui/primitives";
import { api } from "@/lib/clientApi";
import { PIPELINE_LABELS, PIPELINE_STAGES } from "@/pipeline/stages";
import { Bot, Copy, ExternalLink, MonitorPlay, Sparkles } from "lucide-react";

export default function ConfiguracoesPage() {
  const [provider, setProvider] = useState("mock");
  const [mode, setMode] = useState("assisted");
  const [browserTarget, setBrowserTarget] = useState("playwright");
  const [flowUrl, setFlowUrl] = useState("");
  const [kaloUrl, setKaloUrl] = useState("");
  const [maxUpload, setMaxUpload] = useState(0);
  const [dicloakMsg, setDicloakMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [claudeMsg, setClaudeMsg] = useState("");

  useEffect(() => {
    void api.meta().then((m) => {
      setProvider(m.provider);
      setMode(m.browserAgentMode);
      setBrowserTarget(m.browserTarget || "playwright");
      setFlowUrl(m.googleFlowUrl);
      setKaloUrl(m.kalodataUrl);
      setMaxUpload(m.maxUploadBytes || 0);
      if (m.dicloak?.configured) {
        const probe = m.dicloak.probe;
        setDicloakMsg(
          probe
            ? `${probe.ok ? "OK" : "Falhou"} — ${probe.message} (${m.dicloak.apiUrl})`
            : `Configurado · serial=${m.dicloak.profileSerial || "—"} id=${m.dicloak.profileId || "—"}`,
        );
      } else {
        setDicloakMsg(
          "Open API opcional. Sem chave, use Claude + Abrir no DICloak (Computer Use / manual).",
        );
      }
    });
  }, []);

  async function copyText(label: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setClaudeMsg(`${label} copiado — cole no Claude.`);
    } catch {
      setClaudeMsg("Falha ao copiar. Abra /api/claude-brief no navegador.");
    }
  }

  async function copyClaudePrompt() {
    setBusy(true);
    setClaudeMsg("");
    try {
      const data = await api.claudeBrief({ mode: "prompt" });
      await copyText(
        "Prompt mestre Claude",
        data.prompt || data.systemPrompt || "",
      );
    } catch (e) {
      setClaudeMsg(e instanceof Error ? e.message : "Falha ao buscar prompt");
    } finally {
      setBusy(false);
    }
  }

  async function copyClaudeBriefing() {
    setBusy(true);
    setClaudeMsg("");
    try {
      const data = await api.claudeBrief();
      await copyText(
        "Briefing completo",
        data.fullBriefing || data.markdown || "",
      );
    } catch (e) {
      setClaudeMsg(e instanceof Error ? e.message : "Falha ao buscar briefing");
    } finally {
      setBusy(false);
    }
  }

  async function openTools() {
    setBusy(true);
    setMessage("");
    try {
      const { job } = await api.agent.start({ action: "open_tools" });
      setMessage(
        browserTarget === "dicloak"
          ? `Agente ${job.id}: conectando no perfil DICloak (Flow/Veo).`
          : `Agente iniciado (${job.id}).`,
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Falha ao abrir agente");
    } finally {
      setBusy(false);
    }
  }

  async function closeTools() {
    setBusy(true);
    try {
      await api.agent.start({ action: "close" });
      setMessage("Sessão do navegador do agente encerrada.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Falha ao fechar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Configurações"
        subtitle="Conecte Claude + DICloak + Flow/Veo3 + Kalodata ao Model Studeo."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="Claude (automação)"
          description="Cole o prompt no Claude. Ele usa o Model Studeo + Flow + Kalodata."
        >
          <div className="space-y-3 text-sm">
            <ol className="list-decimal space-y-1 pl-4 text-xs leading-5 text-[var(--muted)]">
              <li>
                Copie o <strong>prompt mestre</strong> e cole no Claude (projeto /
                instruções do chat).
              </li>
              <li>
                No studio: avatar + roupa → <strong>Gerar</strong>.
              </li>
              <li>
                Copie o <strong>briefing</strong> (prompts + links das fotos) e
                cole no Claude: “execute este pacote no Flow”.
              </li>
              <li>
                DICloak → <strong>Abrir</strong> Flow/Veo3 e/ou Kalodata para o
                Claude operar.
              </li>
            </ol>
            <div className="flex flex-wrap gap-2">
              <Button loading={busy} onClick={() => void copyClaudePrompt()}>
                <Bot size={16} />
                Copiar prompt mestre Claude
              </Button>
              <Button
                variant="secondary"
                loading={busy}
                onClick={() => void copyClaudeBriefing()}
              >
                <Copy size={16} />
                Copiar briefing (última geração)
              </Button>
            </div>
            {claudeMsg ? (
              <p className="rounded-xl bg-[var(--accent-soft)] px-3 py-2 text-xs leading-5 text-[#4930b5]">
                {claudeMsg}
              </p>
            ) : null}
            <p className="text-[11px] text-[var(--muted)]">
              API:{" "}
              <a
                className="text-[var(--accent)]"
                href="/api/claude-brief?mode=prompt"
                target="_blank"
                rel="noreferrer"
              >
                /api/claude-brief?mode=prompt
              </a>{" "}
              ·{" "}
              <a
                className="text-[var(--accent)]"
                href="/api/claude-brief"
                target="_blank"
                rel="noreferrer"
              >
                /api/claude-brief
              </a>
            </p>
          </div>
        </Panel>

        <Panel
          title="DICloak + Flow/Veo"
          description="Opcional: Open API. Sem chave, Claude usa a janela que você abrir."
        >
          <div className="space-y-3 text-sm">
            <p>
              Provider: <strong className="capitalize">{provider}</strong> ·
              Alvo: <strong className="capitalize">{browserTarget}</strong> ·
              Modo: <strong>{mode}</strong>
            </p>
            <p className="text-xs leading-5 text-[var(--muted)]">{dicloakMsg}</p>
            <div className="flex flex-wrap gap-2">
              <Button loading={busy} onClick={() => void openTools()}>
                <MonitorPlay size={16} />
                Conectar Flow (agente local)
              </Button>
              <Button
                variant="secondary"
                loading={busy}
                onClick={() => void closeTools()}
              >
                Desconectar
              </Button>
            </div>
            {message ? (
              <p className="rounded-xl bg-[var(--accent-soft)] px-3 py-2 text-xs leading-5 text-[#4930b5]">
                {message}
              </p>
            ) : null}
            <div className="flex flex-col gap-2 text-xs">
              <a
                href={flowUrl || "https://flow.google/"}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[var(--accent)]"
              >
                Google Flow <ExternalLink size={12} />
              </a>
              <a
                href={kaloUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[var(--accent)]"
              >
                Kalodata <ExternalLink size={12} />
              </a>
            </div>
            <p className="mt-1 flex items-start gap-2 rounded-xl border border-[var(--line)] p-3 text-xs leading-5 text-[var(--muted)]">
              <Sparkles size={14} className="mt-0.5 text-[var(--accent)]" />
              Limite upload:{" "}
              {maxUpload
                ? `${Math.round(maxUpload / (1024 * 1024))}MB`
                : "padrão"}
              . Arquivo <code>CLAUDE.md</code> no projeto também orienta o Claude
              Code.
            </p>
          </div>
        </Panel>

        <Panel title="Pipeline">
          <ol className="space-y-1 text-sm text-[var(--muted)]">
            {PIPELINE_STAGES.map((s) => (
              <li key={s}>
                <span className="font-medium text-[var(--ink)]">{s}</span> —{" "}
                {PIPELINE_LABELS[s]}
              </li>
            ))}
          </ol>
        </Panel>

        <Panel title="Prioridades">
          <ol className="list-decimal space-y-1 pl-5 text-sm text-[var(--muted)]">
            <li>Fidelidade absoluta ao produto</li>
            <li>Consistência da personagem</li>
            <li>Anatomia humana</li>
            <li>Realismo</li>
            <li>Naturalidade UGC</li>
            <li>Potencial comercial</li>
            <li>Variedade criativa</li>
          </ol>
        </Panel>
      </div>
    </div>
  );
}
