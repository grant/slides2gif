import React from 'react';
import {SelectedSlide} from '../../lib/hooks/useSelectedSlides';

interface TimelineProps {
  selectedSlides: SelectedSlide[];
  draggedIndex: number | null;
  onDragStart: (index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDrop: (index: number) => void;
  onDragEnd: () => void;
  onRemove: (index: number) => void;
  /** When true, only reorder is allowed (e.g. markdown flow); remove button is hidden */
  reorderOnly?: boolean;
  /** When true, timeline is display-only: not draggable or clickable (e.g. markdown flow) */
  disabled?: boolean;
  /** When disabled and no selectedSlides, show these non-interactive placeholder cards (e.g. md mode) */
  placeholderSlides?: string[];
  /** Optional theme for placeholder styling (accent bar, background) */
  placeholderTheme?: {
    backgroundColor?: string | null;
    accentColor?: string | null;
  };
}

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

function hashString(input: string) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function isDarkHexColor(hex: string | null | undefined) {
  if (!hex) return false;
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return false;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  // relative luminance (sRGB)
  const srgb = [r, g, b].map(v => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  const lum = 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
  return lum < 0.45;
}

function computeSkeletonLineCount(md: string) {
  const lines = md
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .filter(l => l !== '---');
  const charCount = lines.join(' ').replace(/\s+/g, ' ').trim().length;
  const lineCount = lines.length;
  const score = clamp01((charCount / 520 + lineCount / 14) / 2);
  return 1 + Math.round(score * 6); // 1..7
}

export function Timeline({
  selectedSlides,
  draggedIndex,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onRemove,
  reorderOnly = false,
  disabled = false,
  placeholderSlides = [],
  placeholderTheme,
}: TimelineProps) {
  if (selectedSlides.length === 0) {
    if (disabled && placeholderSlides.length > 0) {
      const bg = placeholderTheme?.backgroundColor ?? '#f1f5f9';
      const accent = placeholderTheme?.accentColor ?? null;
      const dark = isDarkHexColor(bg);
      const skeletonStyle: React.CSSProperties = dark
        ? {backgroundColor: 'rgba(255,255,255,0.5)'}
        : {backgroundColor: 'rgb(148,163,184)'};
      return (
        <div
          className={`max-h-96 overflow-y-auto pr-2 ${disabled ? 'cursor-not-allowed' : ''}`}
        >
          <div
            className="grid gap-2"
            style={{gridTemplateColumns: 'repeat(auto-fill, 160px)'}}
          >
            {placeholderSlides.map((md, i) => {
              const seed = hashString(md) ^ (i * 2654435761);
              const lineCount = computeSkeletonLineCount(md);
              const widths = Array.from({length: lineCount}, (_, j) => {
                const base = 58 + ((seed + j * 37) % 35); // 58..92
                const tail = 38 + ((seed + j * 53) % 28); // 38..65
                return j === lineCount - 1 ? tail : base;
              });
              const hasTitle = md
                .split('\n')
                .map(l => l.trim())
                .filter(Boolean)[0]
                ?.startsWith('#');

              return (
                <div
                  key={`placeholder-${i}`}
                  className="pointer-events-none relative overflow-hidden rounded border-2 border-gray-200 bg-white"
                  style={{
                    backgroundColor: bg,
                    backgroundImage: accent
                      ? `linear-gradient(to bottom, ${accent} 0%, ${accent} 12%, transparent 12%)`
                      : undefined,
                  }}
                >
                  <div className="aspect-video w-full p-3 pt-[17px]">
                    <div className="flex h-full w-full flex-col justify-start gap-[6px]">
                      {hasTitle && (
                        <div
                          className="h-2 shrink-0 rounded"
                          style={{
                            ...skeletonStyle,
                            width: `${68 + (seed % 20)}%`,
                          }}
                        />
                      )}
                      {widths.map((w, idx) => (
                        <div
                          // eslint-disable-next-line react/no-array-index-key -- deterministic placeholder skeletons
                          key={idx}
                          className="h-2 shrink-0 rounded"
                          style={{
                            ...skeletonStyle,
                            width: `${w}%`,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="absolute top-0.5 left-0.5 rounded bg-black/70 px-1 py-0.5 text-[9px] font-medium text-white">
                    {i + 1}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return (
      <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-4 text-center">
        <p className="text-xs text-gray-500">
          Select slides to add to timeline
        </p>
      </div>
    );
  }

  return (
    <div
      className={`max-h-96 overflow-y-auto pr-2 ${disabled ? 'cursor-not-allowed' : ''}`}
    >
      <div
        className="grid gap-2"
        style={{
          gridTemplateColumns: 'repeat(auto-fill, 160px)',
        }}
      >
        {selectedSlides.map((selectedSlide, index) => (
          <div
            key={`${selectedSlide.objectId}-${index}`}
            draggable={!disabled}
            onDragStart={
              disabled
                ? undefined
                : e => {
                    onDragStart(index);
                    e.dataTransfer.effectAllowed = 'move';
                  }
            }
            onDragOver={
              disabled
                ? undefined
                : e => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    if (draggedIndex !== null && draggedIndex !== index) {
                      e.currentTarget.style.opacity = '0.5';
                    }
                    onDragOver(e, index);
                  }
            }
            onDragLeave={
              disabled ? undefined : e => (e.currentTarget.style.opacity = '1')
            }
            onDrop={
              disabled
                ? undefined
                : e => {
                    e.preventDefault();
                    e.currentTarget.style.opacity = '1';
                    onDrop(index);
                  }
            }
            onDragEnd={disabled ? undefined : () => onDragEnd()}
            className={`group relative overflow-hidden rounded border-2 bg-white transition-all ${
              disabled
                ? 'cursor-not-allowed border-gray-300'
                : draggedIndex === index
                  ? 'cursor-move border-blue-500 opacity-50'
                  : 'cursor-move border-gray-300 hover:border-blue-400'
            }`}
          >
            {selectedSlide.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- dynamic thumbnail URL
              <img
                src={selectedSlide.thumbnailUrl}
                alt={`Frame ${index + 1}`}
                className="block aspect-video w-full bg-gray-100 object-cover"
              />
            ) : (
              <div className="flex aspect-video w-full items-center justify-center bg-gray-100 text-[10px] text-gray-500">
                No preview
              </div>
            )}
            <div className="absolute top-0.5 left-0.5 rounded bg-black/70 px-1 py-0.5 text-[9px] font-medium text-white">
              {index + 1}
            </div>
            {!reorderOnly && !disabled && (
              <button
                onClick={e => {
                  e.stopPropagation();
                  onRemove(index);
                }}
                className="absolute top-0.5 right-0.5 hidden rounded-full bg-red-500 p-1 text-white opacity-0 transition-all group-hover:block group-hover:opacity-100 hover:scale-110"
                aria-label="Remove frame"
                type="button"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
