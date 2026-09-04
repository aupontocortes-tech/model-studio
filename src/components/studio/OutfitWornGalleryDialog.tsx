"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Star, Trash2, X, ZoomIn } from "lucide-react";
import {
  outfitLabel,
  outfitWornUrls,
  type StudioOutfit,
  type WornPhotoRef,
} from "@/domain/studioAssets";
import { ImageLightbox } from "@/components/studio/ImageLightbox";

const ACCEPT = "image/*,.heic,.heif";

export function OutfitWornGalleryDialog({
  outfit,
  disabled,
  onClose,
  onUpload,
  onRemove,
  onSetPrimary,
}: {
  outfit: StudioOutfit;
  disabled?: boolean;
  onClose: () => void;
  onUpload: (files: File[]) => Promise<void>;
  onRemove: (ref: WornPhotoRef) => Promise<void>;
  onSetPrimary: (ref: WornPhotoRef) => Promise<void>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const urls = outfitWornUrls(outfit);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !lightbox) onClose();
    };
    window.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [lightbox, onClose]);

  function photoRef(url: string, index: number): WornPhotoRef {
    return index === 0
      ? { outfitId: outfit.id, url, kind: "primary" }
      : {
          outfitId: outfit.id,
          url,
          kind: "gallery",
          galleryIndex: index - 1,
        };
  }

  return (
    <>
      <div
        className="fixed inset-0 z-[70] flex items-center justify-center bg-black/65 p-3 sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-label={`Fotos de ${outfitLabel(outfit)} vestida`}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--panel)] shadow-2xl">
          <div className="flex items-start justify-between gap-4 border-b border-[var(--line)] p-4 sm:p-5">
            <div>
              <h2 className="text-base font-semibold text-[var(--ink)]">
                Ela vestida · {outfitLabel(outfit)}
              </h2>
              <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                Guarde várias poses com a mesma roupa. A foto com estrela é a
                capa do look.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--panel-elevated)]"
              aria-label="Fechar galeria"
            >
              <X size={18} />
            </button>
          </div>

          <div className="overflow-y-auto p-4 sm:p-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {urls.map((url, index) => {
                const ref = photoRef(url, index);
                return (
                  <div
                    key={url}
                    className="overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--panel-elevated)]"
                  >
                    <button
                      type="button"
                      className="relative block w-full overflow-hidden"
                      onClick={() => setLightbox(url)}
                      aria-label="Ampliar foto"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt={`Ela vestida, foto ${index + 1}`}
                        className="aspect-[3/4] w-full object-cover transition hover:scale-[1.02]"
                      />
                      {index === 0 ? (
                        <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-[var(--accent)] px-2 py-1 text-[9px] font-semibold text-white shadow">
                          <Star size={10} fill="currentColor" /> Capa
                        </span>
                      ) : null}
                    </button>
                    <div className="flex items-center justify-center gap-1 p-1.5">
                      <button
                        type="button"
                        title="Ver maior"
                        className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--panel)] hover:text-[var(--ink)]"
                        onClick={() => setLightbox(url)}
                      >
                        <ZoomIn size={14} />
                      </button>
                      {index > 0 ? (
                        <button
                          type="button"
                          title="Usar como capa"
                          disabled={disabled}
                          className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--panel)] hover:text-[var(--accent)]"
                          onClick={() => void onSetPrimary(ref)}
                        >
                          <Star size={14} />
                        </button>
                      ) : null}
                      <button
                        type="button"
                        title="Excluir esta foto"
                        disabled={disabled}
                        className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--panel)] hover:text-[var(--danger)]"
                        onClick={() => {
                          if (window.confirm("Excluir somente esta foto?")) {
                            void onRemove(ref);
                          }
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}

              <button
                type="button"
                disabled={disabled}
                onClick={() => fileRef.current?.click()}
                className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--line)] bg-[var(--panel-elevated)] p-4 text-center text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-50"
              >
                <span className="rounded-full bg-[var(--accent-soft)] p-3 text-[var(--accent)]">
                  <ImagePlus size={22} />
                </span>
                <span className="text-xs font-semibold">Adicionar fotos</span>
                <span className="text-[10px] leading-4">
                  Escolha uma ou várias de uma vez
                </span>
              </button>
            </div>

            {urls.length === 0 ? (
              <p className="mt-3 text-center text-xs text-[var(--muted)]">
                Ainda não há fotos dela usando este look.
              </p>
            ) : null}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-[var(--line)] p-4">
            <p className="text-[11px] text-[var(--muted)]">
              {urls.length} {urls.length === 1 ? "foto" : "fotos"} neste look
            </p>
            <button
              type="button"
              disabled={disabled}
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
            >
              <ImagePlus size={15} />
              Adicionar fotos
            </button>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept={ACCEPT}
            multiple
            className="sr-only"
            onChange={(event) => {
              const files = Array.from(event.target.files || []);
              event.target.value = "";
              if (files.length) void onUpload(files);
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
