"use client";

import { useState } from "react";
import { GripVertical, Trash2, ZoomIn } from "lucide-react";
import { outfitLabel, type StudioOutfit } from "@/domain/studioAssets";
import { ImageLightbox } from "@/components/studio/ImageLightbox";

function Thumb({
  src,
  label,
  empty,
  onZoom,
}: {
  src?: string;
  label: string;
  empty: string;
  onZoom?: (src: string) => void;
}) {
  return (
    <div className="relative min-w-0">
      <p className="mb-0.5 truncate text-[9px] font-medium uppercase tracking-wide text-[var(--muted)]">
        {label}
      </p>
      {src ? (
        <div className="relative overflow-hidden rounded-md">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={label}
            className="aspect-square w-full object-cover"
            draggable={false}
          />
          {onZoom ? (
            <button
              type="button"
              className="absolute bottom-0.5 right-0.5 rounded bg-black/60 p-0.5 text-white hover:bg-black/80"
              title="Ver maior"
              aria-label={`Ampliar ${label}`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onZoom(src);
              }}
            >
              <ZoomIn size={11} />
            </button>
          ) : null}
        </div>
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
        role={onSelect ? "button" : undefined}
        tabIndex={onSelect ? 0 : undefined}
        draggable={draggable}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onDragEnd={onDragEnd}
        onClick={() => onSelect?.()}
        onKeyDown={(e) => {
          if (!onSelect) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect();
          }
        }}
        className={`relative overflow-hidden rounded-xl border p-1.5 text-left transition ${
          selected
            ? "border-[var(--accent)] ring-2 ring-[var(--accent)]"
            : "border-[var(--line)] hover:border-[var(--accent)]"
        } ${dragging ? "opacity-40" : ""} ${
          dragOver ? "border-[var(--accent)] ring-2 ring-[var(--accent)]" : ""
        } ${onSelect ? "cursor-pointer" : ""} ${
          draggable ? "cursor-grab active:cursor-grabbing" : ""
        }`}
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
        {selected ? (
          <span className="absolute left-1/2 top-1 z-[1] -translate-x-1/2 rounded-full bg-[var(--accent)] px-2 py-0.5 text-[9px] font-semibold text-white">
            Selecionado
          </span>
        ) : null}
        <div className="grid grid-cols-2 gap-1.5">
          <Thumb
            src={outfit.imageUrl}
            label="Peça"
            empty="Peça"
            onZoom={(src) => setLightbox({ src, alt: "Peça" })}
          />
          <Thumb
            src={outfit.wornImageUrl}
            label="Vestida"
            empty="Vestida"
            onZoom={(src) => setLightbox({ src, alt: "Ela vestida" })}
          />
        </div>
        {hasName ? (
          <p className="mt-1 truncate px-0.5 text-[11px] font-medium text-[var(--ink)]">
            {label}
          </p>
        ) : (
          <p className="mt-1 truncate px-0.5 text-[10px] text-[var(--muted)]">
            Toque para escolher
          </p>
        )}
        {onRemove ? (
          <button
            type="button"
            className="absolute right-1 top-1 rounded-md bg-black/55 p-1 text-white hover:bg-black/75"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
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
