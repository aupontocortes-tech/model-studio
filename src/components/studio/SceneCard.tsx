"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { sceneLabel, type StudioScene } from "@/domain/studioAssets";
import { ImageLightbox } from "@/components/studio/ImageLightbox";

function Thumb({
  src,
  label,
  empty,
  onOpen,
}: {
  src?: string;
  label: string;
  empty: string;
  onOpen?: (src: string) => void;
}) {
  return (
    <div className="min-w-0">
      <p className="mb-0.5 truncate text-[9px] font-medium uppercase tracking-wide text-[var(--muted)]">
        {label}
      </p>
      {src ? (
        <button
          type="button"
          className="block w-full overflow-hidden rounded-md"
          title="Ver maior"
          onClick={(e) => {
            e.stopPropagation();
            onOpen?.(src);
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={label}
            className="aspect-square w-full object-cover"
          />
        </button>
      ) : (
        <div className="flex aspect-square items-center justify-center rounded-md bg-[var(--panel-elevated)] px-1 text-center text-[9px] leading-3 text-[var(--muted)]">
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
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(
    null,
  );
  const label = sceneLabel(scene);
  const hasName = Boolean(scene.name?.trim());

  return (
    <>
      <div
        className={`relative overflow-hidden rounded-xl border text-left transition ${
          selected
            ? "border-[var(--accent)] ring-2 ring-[var(--accent-soft)]"
            : "border-[var(--line)] hover:border-[var(--accent)]"
        }`}
      >
        <button
          type="button"
          className="block w-full p-1.5"
          onClick={onSelect}
          disabled={!onSelect}
        >
          <div className="grid grid-cols-2 gap-1.5">
            <Thumb
              src={scene.imageUrl}
              label="Lugar"
              empty="Lugar"
              onOpen={(src) => setLightbox({ src, alt: "Lugar" })}
            />
            <Thumb
              src={scene.inSceneImageUrl}
              label="Nela"
              empty="Nela"
              onOpen={(src) => setLightbox({ src, alt: "Ela no cenário" })}
            />
          </div>
          {hasName ? (
            <p className="mt-1 truncate px-0.5 text-[11px] font-medium text-[var(--ink)]">
              {label}
            </p>
          ) : null}
        </button>
        {onRemove ? (
          <button
            type="button"
            className="absolute right-1 top-1 rounded-md bg-black/55 p-1 text-white hover:bg-black/75"
            onClick={onRemove}
            aria-label="Remover cenário"
          >
            <Trash2 size={12} />
          </button>
        ) : null}
      </div>
      {lightbox ? (
        <ImageLightbox
          src={lightbox.src}
          alt={lightbox.alt}
          onClose={() => setLightbox(null)}
        />
      ) : null}
    </>
  );
}
