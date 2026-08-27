"use client";

import { useState } from "react";
import { GripVertical, Trash2 } from "lucide-react";
import { outfitLabel, type StudioOutfit } from "@/domain/studioAssets";
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

export function OutfitCard({
  outfit,
  selected = false,
  onSelect,
  onRemove,
  draggable = false,
  dragging = false,
  dragOver = false,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
}: {
  outfit: StudioOutfit;
  selected?: boolean;
  onSelect?: () => void;
  onRemove?: () => void;
  draggable?: boolean;
  dragging?: boolean;
  dragOver?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
}) {
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(
    null,
  );
  const label = outfitLabel(outfit);
  const hasName = Boolean(outfit.name?.trim());

  return (
    <>
      <div
        draggable={draggable}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onDragEnd={onDragEnd}
        className={`relative overflow-hidden rounded-xl border text-left transition ${
          selected
            ? "border-[var(--accent)] ring-2 ring-[var(--accent-soft)]"
            : "border-[var(--line)] hover:border-[var(--accent)]"
        } ${dragging ? "opacity-40" : ""} ${
          dragOver ? "border-[var(--accent)] ring-2 ring-[var(--accent)]" : ""
        } ${draggable ? "cursor-grab active:cursor-grabbing" : ""}`}
      >
        {draggable ? (
          <span
            className="absolute left-1 top-1 z-[1] rounded-md bg-black/45 p-0.5 text-white/90"
            title="Arraste para reorganizar"
            aria-hidden
          >
            <GripVertical size={12} />
          </span>
        ) : null}
        <button
          type="button"
          className="block w-full p-1.5"
          onClick={onSelect}
          disabled={!onSelect}
        >
          <div className="grid grid-cols-2 gap-1.5">
            <Thumb
              src={outfit.imageUrl}
              label="Peça"
              empty="Peça"
              onOpen={(src) => setLightbox({ src, alt: "Peça" })}
            />
            <Thumb
              src={outfit.wornImageUrl}
              label="Vestida"
              empty="Vestida"
              onOpen={(src) => setLightbox({ src, alt: "Ela vestida" })}
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
            aria-label="Remover roupa"
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
