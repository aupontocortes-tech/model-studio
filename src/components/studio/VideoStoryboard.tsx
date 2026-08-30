"use client";

import { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Film,
  ImagePlus,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { Button, inputClass } from "@/components/ui/primitives";
import { prepareImageFile } from "@/lib/prepareImage";

export type VideoStoryboardClip = {
  id: string;
  title: string;
  duration: number;
  action: string;
  startImageUrl?: string;
  endImageUrl?: string;
  videoUrl?: string;
};

function newClip(index: number): VideoStoryboardClip {
  return {
    id: `clip_${Date.now()}_${index}`,
    title: `Clipe ${index}`,
    duration: 8,
    action: "",
  };
}

export function storyboardPrompt(
  clips: VideoStoryboardClip[],
  baseUrl = "",
): string {
  if (!clips.length) return "";
  const absolute = (url?: string) => {
    if (!url) return "";
    if (/^https?:\/\//i.test(url) || url.startsWith("data:")) return url;
    return `${baseUrl.replace(/\/$/, "")}${url.startsWith("/") ? "" : "/"}${url}`;
  };
  const lines = [
    "",
    "## STORYBOARD / VÍDEO POR FRAMES",
    `Gere ${clips.length} clipe(s) na ordem abaixo e depois una tudo em um único vídeo, sem tela preta, salto de identidade ou troca de roupa.`,
  ];
  clips.forEach((clip, index) => {
    lines.push(
      "",
      `### CLIPE ${index + 1} — ${clip.title || `Clipe ${index + 1}`} (${clip.duration}s)`,
      clip.startImageUrl
        ? `- FRAME INICIAL: ${absolute(clip.startImageUrl)}`
        : "- FRAME INICIAL: use a imagem anterior / referência principal",
      clip.endImageUrl
        ? `- FRAME FINAL: ${absolute(clip.endImageUrl)}`
        : "- FRAME FINAL: termine naturalmente e preserve continuidade",
      clip.action
        ? `- AÇÃO: ${clip.action}`
        : "- AÇÃO: movimento natural, suave e realista",
      clip.videoUrl
        ? `- VÍDEO JÁ PRONTO PARA A MONTAGEM: ${absolute(clip.videoUrl)}`
        : "- Gere este clipe na ferramenta escolhida.",
    );
  });
  lines.push(
    "",
    "### MONTAGEM FINAL",
    "- Una os clipes na ordem listada.",
    "- O frame final de um clipe deve combinar visualmente com o frame inicial do próximo.",
    "- Preserve rosto, corpo, look, cenário, luz e proporção escolhida.",
    "- Se houver vídeos já prontos, use-os na montagem; gere apenas os clipes sem vídeo.",
    "- Entregue um único vídeo final e também mantenha os clipes separados.",
  );
  return lines.join("\n");
}

export function VideoStoryboard({
  value,
  onChange,
  savedFrames = [],
  disabled,
}: {
  value: VideoStoryboardClip[];
  onChange: (clips: VideoStoryboardClip[]) => void;
  savedFrames?: Array<{ url: string; label: string }>;
  disabled?: boolean;
}) {
  const [uploading, setUploading] = useState("");

  useEffect(() => {
    if (value.length === 0) onChange([newClip(1)]);
  }, [value, onChange]);

  function patch(id: string, update: Partial<VideoStoryboardClip>) {
    onChange(value.map((clip) => (clip.id === id ? { ...clip, ...update } : clip)));
  }

  async function upload(
    clip: VideoStoryboardClip,
    slot: "start" | "end" | "video",
    file: File,
  ) {
    setUploading(`${clip.id}-${slot}`);
    try {
      const prepared = slot === "video" ? file : await prepareImageFile(file);
      const form = new FormData();
      form.append("file", prepared);
      form.append("clipId", clip.id);
      form.append("slot", slot);
      const response = await fetch("/api/studio/video-assets/upload", {
        method: "POST",
        body: form,
      });
      const data = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !data.url) {
        throw new Error(data.error || "Falha no upload.");
      }
      patch(clip.id, {
        [slot === "start"
          ? "startImageUrl"
          : slot === "end"
            ? "endImageUrl"
            : "videoUrl"]: data.url,
      });
    } finally {
      setUploading("");
    }
  }

  function move(index: number, direction: -1 | 1) {
    const next = [...value];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-[13px] font-semibold text-[var(--ink)]">
          Vídeo por frames / clipes
        </p>
        <p className="mt-1 text-[11px] leading-4 text-[var(--muted)]">
          Coloque imagem inicial e final. Adicione quantos clipes quiser; o
          Claude recebe a ordem para gerar e juntar.
        </p>
      </div>

      {value.map((clip, index) => (
        <div
          key={clip.id}
          className="rounded-xl border border-[var(--line)] bg-[var(--panel-elevated)] p-3"
        >
          <div className="mb-3 flex items-center gap-2">
            <Film size={15} className="text-[var(--accent)]" />
            <input
              className={`${inputClass} min-w-0 flex-1 py-1.5 text-xs`}
              value={clip.title}
              onChange={(e) => patch(clip.id, { title: e.target.value })}
              aria-label={`Nome do clipe ${index + 1}`}
            />
            <input
              type="number"
              min={1}
              max={30}
              className={`${inputClass} w-16 py-1.5 text-xs`}
              value={clip.duration}
              onChange={(e) =>
                patch(clip.id, {
                  duration: Math.max(1, Math.min(30, Number(e.target.value) || 8)),
                })
              }
              title="Duração em segundos"
            />
            <span className="text-[10px] text-[var(--muted)]">s</span>
          </div>

          <textarea
            className={`${inputClass} mb-3 min-h-16 text-xs`}
            value={clip.action}
            onChange={(e) => patch(clip.id, { action: e.target.value })}
            placeholder="O que acontece neste clipe? Ex.: ela vira de lado e mostra o caimento."
          />

          {index > 0 && value[index - 1]?.endImageUrl ? (
            <button
              type="button"
              disabled={disabled}
              onClick={() =>
                patch(clip.id, {
                  startImageUrl: value[index - 1].endImageUrl,
                })
              }
              className="mb-3 text-[10px] font-semibold text-[var(--accent)] hover:underline"
            >
              Usar o frame final do clipe anterior como início
            </button>
          ) : null}

          <div className="grid grid-cols-2 gap-2">
            {(["start", "end"] as const).map((slot) => {
              const url =
                slot === "start" ? clip.startImageUrl : clip.endImageUrl;
              return (
                <label
                  key={slot}
                  className="cursor-pointer overflow-hidden rounded-lg border border-dashed border-[var(--line)] bg-[var(--panel)]"
                >
                  {url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={url} alt="" className="aspect-video w-full object-cover" />
                  ) : (
                    <span className="flex aspect-video items-center justify-center gap-1 text-[10px] text-[var(--muted)]">
                      <ImagePlus size={14} />
                      {slot === "start" ? "Frame inicial" : "Frame final"}
                    </span>
                  )}
                  <span className="block px-2 py-1 text-center text-[9px] font-medium text-[var(--muted)]">
                    {uploading === `${clip.id}-${slot}`
                      ? "Enviando…"
                      : url
                        ? "Trocar pelo computador/celular"
                        : "Computador/celular"}
                  </span>
                  <input
                    type="file"
                    accept="image/*,.heic,.heif"
                    className="sr-only"
                    disabled={disabled || Boolean(uploading)}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (file) void upload(clip, slot, file);
                    }}
                  />
                </label>
              );
            })}
          </div>

          {savedFrames.length > 0 ? (
            <div className="mt-2 grid grid-cols-2 gap-2">
              {(["start", "end"] as const).map((slot) => {
                const current =
                  slot === "start" ? clip.startImageUrl : clip.endImageUrl;
                return (
                  <select
                    key={slot}
                    className="min-w-0 rounded-lg border border-[var(--line)] bg-[var(--panel)] px-2 py-1.5 text-[10px] text-[var(--ink)]"
                    value={
                      savedFrames.some((frame) => frame.url === current)
                        ? current
                        : ""
                    }
                    disabled={disabled}
                    onChange={(e) =>
                      patch(clip.id, {
                        [slot === "start"
                          ? "startImageUrl"
                          : "endImageUrl"]: e.target.value || undefined,
                      })
                    }
                    aria-label={
                      slot === "start"
                        ? "Escolher frame inicial salvo"
                        : "Escolher frame final salvo"
                    }
                  >
                    <option value="">
                      {slot === "start"
                        ? "Início: galeria da personagem…"
                        : "Fim: galeria da personagem…"}
                    </option>
                    {savedFrames.map((frame, frameIndex) => (
                      <option
                        key={`${slot}-${frame.url}-${frameIndex}`}
                        value={frame.url}
                      >
                        {frame.label}
                      </option>
                    ))}
                  </select>
                );
              })}
            </div>
          ) : (
            <p className="mt-2 text-[10px] text-[var(--muted)]">
              A galeria da personagem ainda não tem fotos “Ela vestida”.
              Você pode enviar do computador/celular acima.
            </p>
          )}

          <label className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-[var(--line)] px-3 py-2 text-[10px] font-medium text-[var(--muted)]">
            <Upload size={13} />
            {clip.videoUrl ? "Vídeo pronto anexado · trocar" : "Anexar vídeo pronto (opcional)"}
            <input
              type="file"
              accept="video/mp4,video/webm,video/quicktime,.mov"
              className="sr-only"
              disabled={disabled || Boolean(uploading)}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void upload(clip, "video", file);
              }}
            />
          </label>

          <div className="mt-2 flex justify-end gap-1">
            <button
              type="button"
              disabled={index === 0}
              onClick={() => move(index, -1)}
              className="rounded-lg p-1.5 text-[var(--muted)] disabled:opacity-30"
              title="Mover para cima"
            >
              <ArrowUp size={14} />
            </button>
            <button
              type="button"
              disabled={index === value.length - 1}
              onClick={() => move(index, 1)}
              className="rounded-lg p-1.5 text-[var(--muted)] disabled:opacity-30"
              title="Mover para baixo"
            >
              <ArrowDown size={14} />
            </button>
            <button
              type="button"
              disabled={value.length === 1}
              onClick={() => onChange(value.filter((x) => x.id !== clip.id))}
              className="rounded-lg p-1.5 text-[var(--danger)] disabled:opacity-30"
              title="Excluir clipe"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ))}

      <Button
        variant="secondary"
        disabled={disabled}
        onClick={() => onChange([...value, newClip(value.length + 1)])}
      >
        <Plus size={14} />
        Adicionar outro clipe
      </Button>
    </div>
  );
}
