"use client";

import { useState } from "react";
import { Upload, ZoomIn, Trash2 } from "lucide-react";
import { ImageLightbox } from "@/components/studio/ImageLightbox";

const ACCEPT_IMAGE = "image/*,.heic,.heif,.jpg,.jpeg,.png,.webp";

/** O input fica ligado ao rótulo — clicar no texto abre o seletor no PC e no celular. */
export function FilePickButton({
  accept,
  label,
  disabled,
  onFile,
  className = "",
}: {
  accept: string;
  label: string;
  disabled?: boolean;
  onFile: (file: File) => void;
  className?: string;
}) {
  return (
    <label
      className={`inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--panel-elevated)] px-4 py-2 text-sm font-semibold text-[var(--ink)] shadow-sm ${
        disabled ? "pointer-events-none opacity-50" : ""
      } ${className}`}
    >
      <Upload size={14} />
      {label}
      <input
        type="file"
        accept={accept}
        disabled={disabled}
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) onFile(f);
        }}
      />
    </label>
  );
}

/** Quadro da foto — clique abre maior; botão envia/troca. */
export function PhotoPickSlot({
  src,
  alt,
  emptyLabel,
  buttonLabel,
  aspectClass = "aspect-square",
  disabled,
  onFile,
  onRemove,
  compact = false,
}: {
  src?: string;
  alt: string;
  emptyLabel: string;
  buttonLabel: string;
  aspectClass?: string;
  disabled?: boolean;
  onFile: (file: File) => void;
  onRemove?: () => void;
  /** Miniatura quadrada pequena (looks / galeria). */
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const boxClass = compact
    ? "aspect-square w-full max-w-[7.5rem]"
    : `${aspectClass} w-full`;

  return (
    <div className={compact ? "w-full max-w-[7.5rem]" : undefined}>
      {src ? (
        <button
          type="button"
          className={`relative mb-2 block overflow-hidden rounded-xl ${boxClass} ${
            disabled ? "opacity-50" : ""
          }`}
          onClick={() => setOpen(true)}
          title="Ver maior"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            className="h-full w-full bg-[var(--panel)] object-cover"
          />
          <span className="absolute bottom-1 right-1 rounded-md bg-black/55 p-1 text-white">
            <ZoomIn size={12} />
          </span>
        </button>
      ) : (
        <label
          className={`relative mb-2 block overflow-hidden rounded-xl ${boxClass} ${
            disabled ? "pointer-events-none opacity-50" : "cursor-pointer"
          }`}
        >
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 border border-dashed border-[var(--line)] bg-[var(--panel)] px-2 text-center text-[10px] text-[var(--muted)]">
            <Upload size={compact ? 14 : 18} />
            <span>{emptyLabel}</span>
          </div>
          <input
            type="file"
            accept={ACCEPT_IMAGE}
            disabled={disabled}
            aria-label={buttonLabel}
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) onFile(f);
            }}
          />
        </label>
      )}
      <FilePickButton
        accept={ACCEPT_IMAGE}
        label={buttonLabel}
        disabled={disabled}
        onFile={onFile}
        className={compact ? "min-h-8 w-full px-2 py-1.5 text-[11px]" : ""}
      />
      {src && onRemove ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            if (
              window.confirm(
                `Tem certeza que deseja excluir a foto “${alt}”?`,
              )
            ) {
              onRemove();
            }
          }}
          className={`mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-[var(--danger)] hover:underline ${
            disabled ? "pointer-events-none opacity-50" : ""
          }`}
        >
          <Trash2 size={12} />
          Excluir foto
        </button>
      ) : null}
      {open && src ? (
        <ImageLightbox src={src} alt={alt} onClose={() => setOpen(false)} />
      ) : null}
    </div>
  );
}
