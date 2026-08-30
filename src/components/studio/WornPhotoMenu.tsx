"use client";

import { useEffect, useRef, useState } from "react";
import { Star, Trash2, Upload, ZoomIn, X } from "lucide-react";
import {
  collectWornPhotosForWardrobe,
  outfitLabel,
  type StudioOutfit,
  type WornPhotoRef,
} from "@/domain/studioAssets";
import { ImageLightbox } from "@/components/studio/ImageLightbox";
import { prepareImageFile } from "@/lib/prepareImage";

const ACCEPT = "image/*,.heic,.heif";

export function WornPhotoMenu({
  open,
  anchorRect,
  onClose,
  wardrobeOutfitIds,
  outfits,
  activeOutfitId,
  selectedRef,
  onSelect,
  onUpload,
  onRemove,
  onSetPrimary,
  disabled,
}: {
  open: boolean;
  anchorRect: DOMRect | null;
  onClose: () => void;
  wardrobeOutfitIds: string[];
  outfits: StudioOutfit[];
  activeOutfitId?: string;
  selectedRef?: WornPhotoRef | null;
  onSelect: (ref: WornPhotoRef) => void;
  onUpload: (file: File, opts: { outfitId: string; append: boolean }) => Promise<void>;
  onRemove: (ref: WornPhotoRef) => Promise<void>;
  onSetPrimary: (ref: WornPhotoRef) => Promise<void>;
  disabled?: boolean;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [uploadTargetId, setUploadTargetId] = useState<string>("");
  const [appendNext, setAppendNext] = useState(true);

  const allRefs = collectWornPhotosForWardrobe(wardrobeOutfitIds, outfits);
  const byOutfit = wardrobeOutfitIds
    .map((id) => {
      const outfit = outfits.find((o) => o.id === id);
      if (!outfit) return null;
      const refs = allRefs.filter((r) => r.outfitId === id);
      if (refs.length === 0) return null;
      return { outfit, refs };
    })
    .filter(Boolean) as Array<{ outfit: StudioOutfit; refs: WornPhotoRef[] }>;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (panelRef.current?.contains(e.target as Node)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const style: React.CSSProperties = anchorRect
    ? {
        position: "fixed",
        top: Math.min(anchorRect.bottom + 8, window.innerHeight - 420),
        left: Math.min(Math.max(8, anchorRect.left), window.innerWidth - 320),
        zIndex: 60,
        width: "min(300px, calc(100vw - 16px))",
      }
    : {
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 60,
        width: "min(300px, calc(100vw - 16px))",
      };

  function isSelected(ref: WornPhotoRef) {
    return (
      selectedRef?.outfitId === ref.outfitId && selectedRef?.url === ref.url
    );
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/20"
        aria-hidden
        onClick={onClose}
      />
      <div
        ref={panelRef}
        style={style}
        className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-3 shadow-2xl"
        role="dialog"
        aria-label="Fotos dela vestida"
      >
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-[var(--ink)]">Ela vestida</p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-[var(--muted)] hover:bg-[var(--panel-elevated)]"
            aria-label="Fechar"
          >
            <X size={16} />
          </button>
        </div>
        <p className="mb-3 text-[11px] leading-4 text-[var(--muted)]">
          Escolha a foto vestida ou adicione outra roupa.
        </p>

        <div className="max-h-[280px] space-y-3 overflow-y-auto pr-0.5">
          {byOutfit.length === 0 ? (
            <p className="text-xs text-[var(--muted)]">
              Nenhuma foto vestida ainda. Adicione abaixo.
            </p>
          ) : (
            byOutfit.map(({ outfit, refs }) => (
              <div key={outfit.id}>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                  {outfitLabel(outfit)}
                </p>
                <div className="grid grid-cols-3 gap-1.5">
                  {refs.map((ref) => (
                    <div key={`${ref.outfitId}-${ref.url}`} className="relative">
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => {
                          onSelect(ref);
                          onClose();
                        }}
                        className={`relative block w-full overflow-hidden rounded-lg border-2 ${
                          isSelected(ref)
                            ? "border-[var(--accent)] ring-2 ring-[var(--accent-soft)]"
                            : "border-[var(--line)] hover:border-[var(--accent)]"
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={ref.url}
                          alt=""
                          className="aspect-square w-full object-cover"
                        />
                        {ref.kind === "primary" ? (
                          <span className="absolute left-0.5 top-0.5 rounded bg-[var(--accent)] px-1 text-[8px] font-bold text-white">
                            Capa
                          </span>
                        ) : null}
                      </button>
                      <div className="mt-0.5 flex justify-center gap-0.5">
                        <button
                          type="button"
                          title="Ver maior"
                          className="rounded p-0.5 text-[var(--muted)] hover:text-[var(--ink)]"
                          onClick={() => setLightbox(ref.url)}
                        >
                          <ZoomIn size={11} />
                        </button>
                        {ref.kind !== "primary" ? (
                          <button
                            type="button"
                            title="Usar como capa"
                            disabled={disabled}
                            className="rounded p-0.5 text-[var(--muted)] hover:text-[var(--accent)]"
                            onClick={() => void onSetPrimary(ref)}
                          >
                            <Star size={11} />
                          </button>
                        ) : null}
                        <button
                          type="button"
                          title="Excluir foto"
                          disabled={disabled}
                          className="rounded p-0.5 text-[var(--muted)] hover:text-[var(--danger)]"
                          onClick={() => void onRemove(ref)}
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-3 space-y-2 border-t border-[var(--line)] pt-3">
          <label className="flex items-center gap-2 text-[11px] text-[var(--muted)]">
            <input
              type="checkbox"
              checked={appendNext}
              onChange={(e) => setAppendNext(e.target.checked)}
            />
            Adicionar sem substituir (mais fotos no mesmo look)
          </label>
          <select
            className="w-full rounded-lg border border-[var(--line)] bg-[var(--panel-elevated)] px-2 py-1.5 text-xs"
            value={uploadTargetId || activeOutfitId || wardrobeOutfitIds[0] || ""}
            onChange={(e) => setUploadTargetId(e.target.value)}
          >
            {wardrobeOutfitIds.map((id) => {
              const o = outfits.find((x) => x.id === id);
              return (
                <option key={id} value={id}>
                  {o ? outfitLabel(o) : id}
                </option>
              );
            })}
            <option value="__new__">+ Novo look</option>
          </select>
          <button
            type="button"
            disabled={disabled}
            onClick={() => fileRef.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--accent-hover)]"
          >
            <Upload size={14} />
            Enviar foto vestida
          </button>
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPT}
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              const target =
                uploadTargetId ||
                activeOutfitId ||
                wardrobeOutfitIds[0] ||
                "__new__";
              void prepareImageFile(f).then((file) =>
                onUpload(file, {
                  outfitId: target,
                  append: appendNext,
                }),
              );
            }}
          />
        </div>
      </div>
      {lightbox ? (
        <ImageLightbox
          src={lightbox}
          alt="Ela vestida"
          onClose={() => setLightbox(null)}
        />
      ) : null}
    </>
  );
}
