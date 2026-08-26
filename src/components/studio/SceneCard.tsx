"use client";

import { Trash2 } from "lucide-react";
import { sceneLabel, type StudioScene } from "@/domain/studioAssets";

function Slot({
  src,
  label,
  empty,
}: {
  src?: string;
  label: string;
  empty: string;
}) {
  return (
    <div className="min-w-0">
      <p className="mb-0.5 px-0.5 text-[9px] font-medium uppercase tracking-wide text-[var(--muted)]">
        {label}
      </p>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={label} className="aspect-[3/4] w-full object-cover" />
      ) : (
        <div className="flex aspect-[3/4] items-center justify-center bg-[var(--panel-elevated)] px-1 text-center text-[10px] leading-3 text-[var(--muted)]">
          {empty}
        </div>
      )}
    </div>
  );
}

export function SceneCard({
  scene,
  selected = false,
  onSelect,
  onRemove,
}: {
  scene: StudioScene;
  selected?: boolean;
  onSelect?: () => void;
  onRemove?: () => void;
}) {
  const label = sceneLabel(scene);
  const hasName = Boolean(scene.name?.trim());

  return (
    <div
      className={`relative overflow-hidden rounded-xl border text-left transition ${
        selected
          ? "border-[var(--accent)] ring-2 ring-[var(--accent-soft)]"
          : "border-[var(--line)] hover:border-[var(--accent)]"
      }`}
    >
      <button
        type="button"
        className="block w-full"
        onClick={onSelect}
        disabled={!onSelect}
      >
        <div className="grid grid-cols-2 gap-px bg-[var(--line)]">
          <Slot src={scene.imageUrl} label="Lugar" empty="Lugar" />
          <Slot
            src={scene.inSceneImageUrl}
            label="Ela no cenário"
            empty="Ela no lugar"
          />
        </div>
      </button>
      {hasName ? (
        <p className="truncate px-2 py-1.5 text-[11px] font-medium text-[var(--ink)]">
          {label}
        </p>
      ) : null}
      {onRemove ? (
        <button
          type="button"
          className="absolute right-1.5 top-1.5 rounded-lg bg-black/55 p-1 text-white hover:bg-black/75"
          onClick={onRemove}
          aria-label="Remover cenário"
        >
          <Trash2 size={12} />
        </button>
      ) : null}
    </div>
  );
}
