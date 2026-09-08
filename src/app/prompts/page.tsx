"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Field,
  PageHeader,
  Panel,
  inputClass,
} from "@/components/ui/primitives";
import { api } from "@/lib/clientApi";
import type { PromptVaultItem } from "@/domain/studioAssets";
import {
  BookOpenText,
  Check,
  Copy,
  Eye,
  Pencil,
  Plus,
  Search,
  Terminal,
  Trash2,
  X,
} from "lucide-react";

const TODOS = "todos" as const;
const COMANDOS = "comandos" as const;
const AREAS_KEY = "ms-prompt-vault-areas";

type SegmentId = typeof TODOS | string;

function slugifyArea(label: string) {
  return label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function areaLabel(id: string) {
  if (id === COMANDOS) return "Comandos";
  return id
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function loadExtraAreas(): string[] {
  try {
    const raw = localStorage.getItem(AREAS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((x) => String(x).trim().toLowerCase())
      .filter((x) => x && x !== COMANDOS && x !== TODOS);
  } catch {
    return [];
  }
}

function saveExtraAreas(areas: string[]) {
  localStorage.setItem(AREAS_KEY, JSON.stringify(areas));
}

const EMPTY_FORM = {
  title: "",
  purpose: "",
  body: "",
  tags: "",
};

type Mode = "browse" | "open" | "create" | "edit";

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
    });
  } catch {
    return iso;
  }
}

function previewText(text: string, max = 110) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max).trim()}…`;
}

export default function PromptsPage() {
  const [items, setItems] = useState<PromptVaultItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("browse");
  const [form, setForm] = useState(EMPTY_FORM);
  const [query, setQuery] = useState("");
  const [segment, setSegment] = useState<SegmentId>(TODOS);
  const [extraAreas, setExtraAreas] = useState<string[]>([]);
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const data = await api.studio.promptVault.list();
    setItems(data.prompts);
  }, []);

  useEffect(() => {
    setExtraAreas(loadExtraAreas());
  }, []);

  useEffect(() => {
    void reload().catch((e) =>
      setError(e instanceof Error ? e.message : "Falha ao carregar prompts."),
    );
  }, [reload]);

  const segments = useMemo(() => {
    const fromItems = items
      .map((item) => (item.area || COMANDOS).toLowerCase())
      .filter(Boolean);
    const set = new Set<string>([COMANDOS, ...extraAreas, ...fromItems]);
    set.delete(TODOS);
    const rest = [...set]
      .filter((id) => id !== COMANDOS)
      .sort((a, b) => areaLabel(a).localeCompare(areaLabel(b), "pt-BR"));
    return [COMANDOS, ...rest];
  }, [items, extraAreas]);

  const activeArea =
    segment === TODOS ? COMANDOS : segment || COMANDOS;

  const inSegment = useMemo(() => {
    if (segment === TODOS) return items;
    return items.filter(
      (item) => (item.area || COMANDOS).toLowerCase() === segment,
    );
  }, [items, segment]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const item of inSegment) {
      for (const tag of item.tags) set.add(tag);
    }
    return [...set].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [inSegment]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return inSegment.filter((item) => {
      if (tagFilter && !item.tags.includes(tagFilter)) return false;
      if (!q) return true;
      const hay =
        `${item.title} ${item.purpose} ${item.body} ${item.tags.join(" ")}`.toLowerCase();
      return hay.includes(q);
    });
  }, [inSegment, query, tagFilter]);

  const selected = items.find((item) => item.id === selectedId) || null;

  function clearFlash() {
    setError("");
    setMsg("");
  }

  function startCreate() {
    setSelectedId(null);
    setForm(EMPTY_FORM);
    setMode("create");
    clearFlash();
  }

  function selectSegment(next: SegmentId) {
    setSegment(next);
    setTagFilter(null);
    clearFlash();
  }

  function addSegment() {
    const raw = window.prompt(
      "Nome do novo ícone/segmento (ex.: Looks, Vídeo, UGC):",
    );
    if (!raw) return;
    const id = slugifyArea(raw);
    if (!id || id === TODOS) {
      setError("Nome inválido para o segmento.");
      return;
    }
    if (id === COMANDOS || segments.includes(id)) {
      selectSegment(id);
      setMsg(`Abrindo ${areaLabel(id)}.`);
      return;
    }
    const next = [...extraAreas, id];
    setExtraAreas(next);
    saveExtraAreas(next);
    selectSegment(id);
    setMsg(`Segmento "${areaLabel(id)}" criado. Pode adicionar prompts nele.`);
  }

  function openItem(item: PromptVaultItem) {
    setSelectedId(item.id);
    setForm({
      title: item.title,
      purpose: item.purpose,
      body: item.body,
      tags: item.tags.join(", "),
    });
    setMode("open");
    clearFlash();
    window.requestAnimationFrame(() => {
      document
        .getElementById("prompt-detail")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function startEdit() {
    if (!selected) return;
    setForm({
      title: selected.title,
      purpose: selected.purpose,
      body: selected.body,
      tags: selected.tags.join(", "),
    });
    setMode("edit");
    clearFlash();
  }

  function editItem(item: PromptVaultItem) {
    setSelectedId(item.id);
    setForm({
      title: item.title,
      purpose: item.purpose,
      body: item.body,
      tags: item.tags.join(", "),
    });
    setMode("edit");
    clearFlash();
    window.requestAnimationFrame(() => {
      document
        .getElementById("prompt-detail")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function closeDetail() {
    setSelectedId(null);
    setForm(EMPTY_FORM);
    setMode("browse");
    clearFlash();
  }

  async function save() {
    const title = form.title.trim();
    const body = form.body.trim();
    if (!title || !body) {
      setError("Preencha o nome e o texto do comando para guardar.");
      setMsg("");
      return;
    }

    setBusy(true);
    clearFlash();
    try {
      const payload = {
        title,
        purpose: form.purpose.trim(),
        body,
        tags: form.tags,
        area: activeArea,
      };
      if (mode === "edit" && selectedId) {
        const { prompt } = await api.studio.promptVault.update(
          selectedId,
          payload,
        );
        setItems((prev) =>
          prev
            .map((item) => (item.id === prompt.id ? prompt : item))
            .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
        );
        setSelectedId(prompt.id);
        setMode("open");
        setMsg("Comando atualizado.");
      } else {
        const { prompt } = await api.studio.promptVault.create(payload);
        setItems((prev) => [prompt, ...prev]);
        setSelectedId(prompt.id);
        setMode("open");
        setMsg("Comando guardado.");
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Não foi possível salvar. Tente de novo.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function removeSelected() {
    if (!selectedId) return;
    await removeItem(selectedId);
  }

  async function removeItem(id: string) {
    if (!window.confirm("Excluir este comando?")) return;
    setBusy(true);
    clearFlash();
    try {
      await api.studio.promptVault.remove(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
      if (selectedId === id) closeDetail();
      setMsg("Comando excluído.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível excluir.");
    } finally {
      setBusy(false);
    }
  }

  async function copyBody(item: PromptVaultItem) {
    try {
      await navigator.clipboard.writeText(item.body);
      setCopiedId(item.id);
      setMsg(`Copiado · ${item.title}`);
      window.setTimeout(() => setCopiedId(null), 1800);
    } catch {
      setError("Não foi possível copiar. Selecione o texto e use Ctrl+C.");
    }
  }

  return (
    <div>
      <PageHeader
        title="Prompts"
        subtitle="Todos os segmentos — Comandos e os que você adicionar."
        actions={
          <Button type="button" onClick={startCreate}>
            <Plus size={16} />
            Novo prompt
          </Button>
        }
      />

      <section className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-[var(--accent)]/25 bg-[var(--accent-soft)] p-4">
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--accent)]">
            O que é
          </p>
          <p className="mt-2 text-base font-semibold leading-6 text-[var(--ink)]">
            Prompt = texto pronto para colar na IA.
          </p>
        </div>
        <div className="rounded-2xl border border-emerald-500/25 bg-[var(--success-bg)] p-4">
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--success-text)]">
            Para que serve
          </p>
          <p className="mt-2 text-base font-semibold leading-6 text-[var(--ink)]">
            Organizar por segmentos: Comandos e outros ícones.
          </p>
        </div>
        <div className="rounded-2xl border border-sky-500/25 bg-[var(--info-bg)] p-4">
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--info-text)]">
            Como usar
          </p>
          <p className="mt-2 text-base font-semibold leading-6 text-[var(--ink)]">
            Em <strong>Todos</strong>, escolha <strong>Comandos</strong> ou adicione outro ícone.
          </p>
        </div>
      </section>

      {error ? (
        <p className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      ) : null}
      {msg ? (
        <p className="mb-4 rounded-xl bg-[var(--success-bg)] px-4 py-3 text-sm text-[var(--success-text)]">
          {msg}
        </p>
      ) : null}

      <Panel
        title="Seus prompts"
        description={`${filtered.length} prompt(s) · toque para posicionar, editar ou copiar`}
      >
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"
            />
            <input
              className={`${inputClass} pl-9`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nome, uso ou trecho…"
            />
          </div>
          <p className="text-xs text-[var(--muted)] sm:whitespace-nowrap">
            {inSegment.length}
            {segment === TODOS
              ? " no total"
              : ` em ${areaLabel(segment)}`}
          </p>
        </div>

        <div className="mb-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => selectSegment(TODOS)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              segment === TODOS
                ? "bg-[var(--accent)] text-white"
                : "border border-[var(--line)] bg-[var(--panel-elevated)] text-[var(--muted)] hover:border-[var(--accent)]"
            }`}
          >
            Todos
          </button>
          {segments.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => selectSegment(id)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                segment === id
                  ? "bg-[var(--accent)] text-white"
                  : "border border-[var(--line)] bg-[var(--panel-elevated)] text-[var(--muted)] hover:border-[var(--accent)]"
              }`}
            >
              {id === COMANDOS ? <Terminal size={12} /> : null}
              {areaLabel(id)}
            </button>
          ))}
          <button
            type="button"
            onClick={addSegment}
            className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-[var(--accent)]/50 bg-[var(--accent-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--accent)] hover:border-[var(--accent)]"
            title="Adicionar outro ícone/segmento"
          >
            <Plus size={12} />
            Ícone
          </button>
        </div>

        {allTags.length > 0 ? (
          <div className="mb-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setTagFilter(null)}
              className={`rounded-lg px-3 py-1.5 text-[11px] font-medium transition ${
                !tagFilter
                  ? "border border-[var(--accent)]/40 bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "border border-[var(--line)] bg-[var(--panel-elevated)] text-[var(--muted)] hover:border-[var(--accent)]"
              }`}
            >
              Todas as tags
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() =>
                  setTagFilter((prev) => (prev === tag ? null : tag))
                }
                className={`rounded-lg px-3 py-1.5 text-[11px] font-medium transition ${
                  tagFilter === tag
                    ? "border border-[var(--accent)]/40 bg-[var(--accent-soft)] text-[var(--accent)]"
                    : "border border-[var(--line)] bg-[var(--panel-elevated)] text-[var(--muted)] hover:border-[var(--accent)]"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        ) : null}

        {filtered.length === 0 ? (
          <div className="flex min-h-52 flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--line)] bg-[var(--panel-elevated)] px-6 text-center">
            <BookOpenText size={22} className="text-[var(--muted)]" />
            <p className="mt-3 text-sm font-semibold text-[var(--ink)]">
              Nenhum prompt neste filtro
            </p>
            <p className="mt-1 max-w-sm text-xs leading-5 text-[var(--muted)]">
              Crie um novo ou limpe a busca. Pode ser de look, vídeo ou qualquer
              ideia.
            </p>
            <Button className="mt-4" onClick={startCreate}>
              <Plus size={14} />
              Novo prompt
            </Button>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((item) => {
              const active = selectedId === item.id && mode !== "create";
              const copied = copiedId === item.id;
              return (
                <li key={item.id}>
                  <article
                    className={`flex h-full flex-col overflow-hidden rounded-2xl border transition ${
                      active
                        ? "border-[var(--accent)] bg-[var(--panel)] shadow-[0_0_0_1px_var(--accent)]"
                        : "border-[var(--line)] bg-[var(--panel)] hover:border-[var(--accent)]"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => openItem(item)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="border-b border-[var(--line)] px-4 pb-3 pt-4">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="line-clamp-2 text-[17px] font-bold leading-6 tracking-[-0.02em] text-[var(--ink)]">
                            {item.title}
                          </h3>
                          <span className="shrink-0 rounded-md bg-[var(--panel-elevated)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--muted)]">
                            {formatDate(item.updatedAt)}
                          </span>
                        </div>
                      </div>

                      <div className="bg-[var(--success-bg)] px-4 py-3">
                        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--success-text)]">
                          Para que serve
                        </p>
                        <p className="mt-1.5 line-clamp-3 text-[15px] font-semibold leading-6 text-[var(--ink)]">
                          {item.purpose || "Sem descrição de uso"}
                        </p>
                      </div>

                      <div className="px-4 py-3">
                        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">
                          Trecho do comando
                        </p>
                        <p className="mt-1.5 line-clamp-3 rounded-xl border border-[var(--line)] bg-[var(--panel-elevated)] px-3 py-2.5 font-mono text-[12px] leading-5 text-[var(--ink)]">
                          {previewText(item.body, 140)}
                        </p>
                      </div>
                    </button>

                    {item.tags.length ? (
                      <div className="flex flex-wrap gap-1.5 px-4 pb-2">
                        {item.tags.slice(0, 4).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-md bg-[var(--accent-soft)] px-2 py-1 text-[11px] font-semibold text-[var(--accent)]"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    <div className="mt-auto grid grid-cols-2 gap-2 px-4 pb-3 sm:grid-cols-4">
                      <button
                        type="button"
                        onClick={() => openItem(item)}
                        className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[var(--accent)] px-2 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]"
                      >
                        <Eye size={15} />
                        Posicionar
                      </button>
                      <button
                        type="button"
                        onClick={() => editItem(item)}
                        className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--panel-elevated)] px-2 text-sm font-semibold text-[var(--ink)] hover:border-[var(--accent)]"
                      >
                        <Pencil size={15} />
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => void copyBody(item)}
                        className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--panel-elevated)] px-2 text-sm font-semibold text-[var(--ink)] hover:border-[var(--accent)]"
                      >
                        {copied ? <Check size={15} /> : <Copy size={15} />}
                        {copied ? "Ok" : "Copiar"}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void removeItem(item.id)}
                        className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-2 text-sm font-semibold text-red-300 hover:border-red-400 disabled:opacity-50"
                      >
                        <Trash2 size={15} />
                        Excluir
                      </button>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      {mode === "open" && selected ? (
        <section
          id="prompt-detail"
          className="mt-5 scroll-mt-6 rounded-2xl border border-[var(--accent)] bg-[var(--panel)] p-5 shadow-[0_12px_40px_rgba(16,24,40,0.08)]"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
                Comando aberto
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-[-0.03em] text-[var(--ink)]">
                {selected.title}
              </h2>
            </div>
            <button
              type="button"
              onClick={closeDetail}
              className="rounded-xl border border-[var(--line)] p-2 text-[var(--muted)] hover:text-[var(--ink)]"
              aria-label="Fechar"
            >
              <X size={16} />
            </button>
          </div>

          <div className="mt-4 rounded-2xl border border-emerald-500/25 bg-[var(--success-bg)] px-4 py-3.5">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--success-text)]">
              Para que serve
            </p>
            <p className="mt-1.5 text-lg font-semibold leading-7 text-[var(--ink)]">
              {selected.purpose || "Sem descrição de uso"}
            </p>
          </div>

          {selected.tags.length ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {selected.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-md bg-[var(--accent-soft)] px-2 py-1 text-[11px] font-semibold text-[var(--accent)]"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}

          <pre className="mt-4 max-h-[420px] overflow-auto whitespace-pre-wrap rounded-2xl border border-[var(--line)] bg-[var(--panel-elevated)] p-4 font-mono text-[13px] leading-6 text-[var(--ink)]">
            {selected.body}
          </pre>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" onClick={() => void copyBody(selected)}>
              {copiedId === selected.id ? (
                <Check size={14} />
              ) : (
                <Copy size={14} />
              )}
              {copiedId === selected.id ? "Copiado" : "Copiar comando"}
            </Button>
            <Button type="button" variant="secondary" onClick={startEdit}>
              <Pencil size={14} />
              Fazer modificações
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={busy}
              onClick={() => void removeSelected()}
            >
              <Trash2 size={14} />
              Excluir
            </Button>
          </div>
          <p className="mt-3 text-xs text-[var(--muted)]">
            Se não der para abrir em outra ferramenta, use <strong>Copiar</strong>{" "}
            e cole no Claude, Flow, ChatGPT ou Tokfy.
          </p>
        </section>
      ) : null}

      {mode === "create" || mode === "edit" ? (
        <div id="prompt-detail" className="mt-5 scroll-mt-6">
          <Panel
            title={mode === "edit" ? "Editar comando" : "Novo comando"}
            description="Preencha nome, para que serve e o texto. Depois ele fica salvo no segmento atual."
          >
            <div className="grid gap-3">
              <Field label="Nome">
                <input
                  className={inputClass}
                  value={form.title}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="Ex.: Transição de look com blackout"
                />
              </Field>
              <Field
                label="Para que serve"
                hint="Uma frase curta para achar depois."
              >
                <input
                  className={inputClass}
                  value={form.purpose}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, purpose: e.target.value }))
                  }
                  placeholder="Ex.: Vídeo 9:16 trocando look sem morphing"
                />
              </Field>
              <Field label="O comando" hint="Cole o texto completo do comando.">
                <textarea
                  className={`${inputClass} min-h-[260px] font-mono text-[11px] leading-4`}
                  value={form.body}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, body: e.target.value }))
                  }
                  placeholder="Cole aqui o comando…"
                />
              </Field>
              <Field
                label="Tags (opcional)"
                hint="Separe por vírgula: still, vídeo, voz…"
              >
                <input
                  className={inputClass}
                  value={form.tags}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, tags: e.target.value }))
                  }
                  placeholder="vídeo, ugc, look"
                />
              </Field>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                type="button"
                loading={busy}
                onClick={() => void save()}
              >
                {mode === "edit" ? (
                  <>
                    <Pencil size={14} />
                    Salvar modificações
                  </>
                ) : (
                  <>
                    <Plus size={14} />
                    Salvar comando
                  </>
                )}
              </Button>
              <Button variant="secondary" onClick={closeDetail}>
                Cancelar
              </Button>
            </div>
          </Panel>
        </div>
      ) : null}
    </div>
  );
}
