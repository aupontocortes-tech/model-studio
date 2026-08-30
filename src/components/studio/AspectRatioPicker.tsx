"use client";

import {
  ASPECT_RATIO_OPTIONS,
  type AspectRatioOption,
} from "@/domain/studioAssets";

export function AspectRatioPicker({
  value,
  onChange,
}: {
  value: AspectRatioOption;
  onChange: (value: AspectRatioOption) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-[13px] font-medium text-[var(--ink)]">
        Tamanho / formato
      </p>
      <div className="grid grid-cols-5 gap-2">
        {ASPECT_RATIO_OPTIONS.map((opt) => {
          const selected = value === opt.id;
          const maxH = 44;
          const scale = maxH / Math.max(opt.width, opt.height);
          const w = Math.round(opt.width * scale);
          const h = Math.round(opt.height * scale);
          return (
            <button
              key={opt.id}
              type="button"
              title={opt.hint}
              onClick={() => onChange(opt.id)}
              className={`flex flex-col items-center gap-1.5 rounded-xl border px-1 py-2 ${
                selected
                  ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                  : "border-[var(--line)] bg-[var(--panel-elevated)] hover:border-[var(--accent)]"
              }`}
            >
              <span
                className={`flex items-center justify-center rounded-sm border-2 ${
                  selected
                    ? "border-[var(--accent)] bg-white"
                    : "border-[var(--muted)] bg-[var(--panel)]"
                }`}
                style={{ width: w, height: h }}
              />
              <span
                className={`text-[10px] font-semibold ${
                  selected ? "text-[var(--accent)]" : "text-[var(--muted)]"
                }`}
              >
                {opt.label}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-1.5 text-[10px] text-[var(--muted)]">
        {ASPECT_RATIO_OPTIONS.find((o) => o.id === value)?.hint}
      </p>
    </div>
  );
}
