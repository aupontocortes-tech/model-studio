"use client";

import { useState } from "react";
import { Grip, GripVertical, Trash2, ZoomIn } from "lucide-react";
import { outfitLabel, type StudioOutfit } from "@/domain/studioAssets";
import { ImageLightbox } from "@/components/studio/ImageLightbox";

function Thumb({
  src,
  label,
  empty,
  slot,
  onZoom,
  onMovePhoto,
  onDeletePhoto,
}: {
  src?: string;
  label: string;
  empty: string;
  slot: "piece" | "worn";
  onZoom?: (src: string) => void;
  onMovePhoto?: (from: "piece" | "worn", to: "piece" | "worn") => void;
  onDeletePhoto?: (slot: "piece" | "worn") => void;
}) {
  return (
    <div
      className="relative min-w-0"
      onDragOver={(e) => {
        if (!onMovePhoto) return;
        const from = e.dataTransfer.types.includes(
          "application/x-model-studeo-photo",
        );
        if (!from) return;
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = "move";
      }}
      onDrop={(e) => {
        if (!onMovePhoto) return;
        const from = e.dataTransfer.getData(
          "application/x-model-studeo-photo",
        ) as "piece" | "worn";
        if (!from || from === slot) return;
        e.preventDefault();
        e.stopPropagation();
        onMovePhoto(from, slot);
      }}
    >
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
          {onMovePhoto ? (
            <button
              type="button"
              draggable
              className="absolute bottom-0.5 left-0.5 cursor-grab rounded bg-black/65 p-0.5 text-white hover:bg-black/85 active:cursor-grabbing"
              title={`Segure e arraste ${label} para o outro lado`}
              aria-label={`Arrastar ${label}`}
              onClick={(e) => e.stopPropagation()}
              onDragStart={(e) => {
                e.stopPropagation();
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData(
                  "application/x-model-studeo-photo",
                  slot,
                );
              }}
            >
              <Grip size={11} />
            </button>
          ) : null}
          {onDeletePhoto ? (
            <button
              type="button"
              className="absolute right-0.5 top-0.5 rounded bg-red-700/80 p-0.5 text-white hover:bg-red-700"
              title={`Excluir somente ${label}`}
              aria-label={`Excluir somente ${label}`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDeletePhoto(slot);
              }}
            >
              <Trash2 size={11} />
            </button>
          ) : null}
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
  onMovePhoto,
  onDeletePhoto,
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
  onMovePhoto?: (from: "piece" | "worn", to: "piece" | "worn") => void;
  onDeletePhoto?: (slot: "piece" | "worn") => void;
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
            slot="piece"
            onZoom={(src) => setLightbox({ src, alt: "Peça" })}
            onMovePhoto={onMovePhoto}
            onDeletePhoto={outfit.imageUrl ? onDeletePhoto : undefined}
          />
          <Thumb
            src={outfit.wornImageUrl}
            label="Vestida"
            empty="Vestida"
            slot="worn"
            onZoom={(src) => setLightbox({ src, alt: "Ela vestida" })}
            onMovePhoto={onMovePhoto}
            onDeletePhoto={outfit.wornImageUrl ? onDeletePhoto : undefined}
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
            className="mt-1 flex w-full items-center justify-center gap-1 rounded-md border border-[var(--line)] py-1 text-[9px] font-medium text-[var(--muted)] hover:border-[var(--danger)] hover:text-[var(--danger)]"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            aria-label="Tirar look do guarda-roupa"
          >
            <Trash2 size={12} />
            Tirar look
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
