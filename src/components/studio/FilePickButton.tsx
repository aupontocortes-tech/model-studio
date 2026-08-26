"use client";

import { Upload } from "lucide-react";

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

/** Quadro da foto inteiro é clicável — não só o botão embaixo. */
export function PhotoPickSlot({
  src,
  alt,
  emptyLabel,
  buttonLabel,
  aspectClass = "aspect-square",
  disabled,
  onFile,
}: {
  src?: string;
  alt: string;
  emptyLabel: string;
  buttonLabel: string;
  aspectClass?: string;
  disabled?: boolean;
  onFile: (file: File) => void;
}) {
  return (
    <div>
      <label
        className={`relative mb-2 block overflow-hidden rounded-xl ${
          disabled ? "pointer-events-none opacity-50" : "cursor-pointer"
        }`}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={alt}
            className={`${aspectClass} w-full bg-[var(--panel)] object-cover`}
          />
        ) : (
          <div
            className={`${aspectClass} flex w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-[var(--line)] bg-[var(--panel)] px-3 text-center text-xs text-[var(--muted)]`}
          >
            <Upload size={18} />
            <span>{emptyLabel}</span>
            <span className="text-[10px]">Toque para escolher a foto</span>
          </div>
        )}
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
      <FilePickButton
        accept={ACCEPT_IMAGE}
        label={buttonLabel}
        disabled={disabled}
        onFile={onFile}
      />
    </div>
  );
}
