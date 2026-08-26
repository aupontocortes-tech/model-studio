"use client";

import { useId, useRef } from "react";
import { Upload } from "lucide-react";

/** Seletor de arquivo confiável em mobile (label > input hidden+click). */
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
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className={className}>
      <input
        id={id}
        ref={inputRef}
        type="file"
        accept={accept}
        className="absolute h-px w-px overflow-hidden whitespace-nowrap border-0 p-0 opacity-0"
        style={{ clipPath: "inset(50%)" }}
        tabIndex={-1}
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) onFile(f);
        }}
      />
      <label
        htmlFor={id}
        aria-disabled={disabled || undefined}
        className={`inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--panel-elevated)] px-4 py-2 text-sm font-semibold text-[var(--ink)] shadow-sm transition hover:border-[var(--accent)] hover:bg-[var(--panel)] ${
          disabled ? "pointer-events-none opacity-50" : ""
        }`}
        onClick={(e) => {
          if (disabled) {
            e.preventDefault();
            return;
          }
          // Alguns WebViews ignoram htmlFor; reforça o open.
          if (inputRef.current && e.target === e.currentTarget) {
            // leave native label behavior
          }
        }}
      >
        <Upload size={14} />
        {label}
      </label>
    </div>
  );
}
