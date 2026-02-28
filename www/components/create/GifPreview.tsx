import React, {useState} from 'react';
import {GifConfig} from '../../lib/hooks/useGifGeneration';
import {Timeline} from './Timeline';
import {SelectedSlide} from '../../lib/hooks/useSelectedSlides';
import {LoadingSpinner} from '../LoadingSpinner';
import type {MarkdownSlideTheme} from '../../lib/markdownTheme';

interface GifPreviewProps {
  gifUrl: string | null;
  gifConfig: GifConfig | null;
  gifDimensions: {width: number; height: number} | null;
  isGenerating: boolean;
  onImageLoad?: (dimensions: {width: number; height: number}) => void;
  selectedSlides: SelectedSlide[];
  draggedIndex: number | null;
  onDragStart: (index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDrop: (index: number) => void;
  onDragEnd: () => void;
  onRemove: (index: number) => void;
  /** Label for the timeline section header */
  timelineTitle?: string;
  /** When true, timeline only allows reorder (e.g. markdown flow) */
  reorderOnly?: boolean;
  /** When true, timeline is display-only: not draggable or clickable (e.g. markdown flow) */
  disabled?: boolean;
  /** If set, show "Open in Google Slides" link on the same line as "Generated GIF", right-aligned */
  openInSlidesUrl?: string | null;
  /** When set (e.g. hover over theme), show a mock slide preview instead of GIF content */
  themePreview?: MarkdownSlideTheme | null;
  themePreviewName?: string | null;
  /** When no GIF, show this theme in the preview slide (title "Example Title", body = emptyStateBodyMessage) */
  defaultPreviewTheme?: MarkdownSlideTheme | null;
  defaultPreviewName?: string | null;
  /** Body text when showing default preview (no GIF). e.g. "Write markdown and click \"GENERATE GIF\"." */
  emptyStateBodyMessage?: string;
  /** In md mode: when no slides yet, show placeholder cards in timeline based on these blocks */
  placeholderSlides?: string[];
  /** Theme for placeholder cards (background, accent bar) */
  placeholderTheme?: {
    backgroundColor?: string | null;
    accentColor?: string | null;
  };
}

export function GifPreview({
  gifUrl,
  gifConfig,
  gifDimensions,
  isGenerating,
  onImageLoad,
  selectedSlides,
  draggedIndex,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onRemove,
  timelineTitle = 'Timeline',
  reorderOnly = false,
  disabled = false,
  openInSlidesUrl = null,
  themePreview = null,
  themePreviewName = null,
  defaultPreviewTheme = null,
  defaultPreviewName = null,
  emptyStateBodyMessage,
  placeholderSlides = [],
  placeholderTheme,
}: GifPreviewProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    if (!gifUrl) return;
    setIsDownloading(true);
    try {
      const proxyUrl = `/api/gifs/download?url=${encodeURIComponent(gifUrl)}`;
      const res = await fetch(proxyUrl);
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'slides.gif';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      window.open(gifUrl, '_blank');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="mb-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h4 className="text-sm font-medium text-gray-700">
            {themePreview != null
              ? 'Customization Preview'
              : gifUrl && !isGenerating
                ? 'Generated GIF'
                : 'Customization Preview'}
          </h4>
          {openInSlidesUrl && (
            <a
              href={openInSlidesUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
            >
              <span className="material-icons text-sm">open_in_new</span>
              Open in Google Slides
            </a>
          )}
        </div>
        <div
          className="rounded-lg border border-gray-300 bg-white p-4"
          style={
            themePreview != null || !gifUrl || isGenerating
              ? {minHeight: 400}
              : undefined
          }
        >
          {isGenerating ? (
            <GeneratingSlide
              theme={
                defaultPreviewTheme ?? {
                  accentColor: null,
                  backgroundColor: null,
                  titleFontColor: null,
                  bodyFontColor: null,
                }
              }
            />
          ) : gifUrl && gifConfig ? (
            <div>
              <div className="mb-2 flex items-center justify-between text-xs text-gray-600">
                <div>
                  {gifConfig.frameCount}{' '}
                  {gifConfig.frameCount === 1 ? 'frame' : 'frames'}{' '}
                  {gifConfig.thumbnailSize} • {gifConfig.delay}ms •{' '}
                  {gifConfig.quality}
                  {gifDimensions && (
                    <>
                      {' '}
                      • {gifDimensions.width}×{gifDimensions.height}
                    </>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
                    aria-label="Download GIF"
                    title="Download GIF"
                  >
                    {isDownloading ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <span className="material-icons text-lg">download</span>
                    )}
                  </button>
                  <a
                    href={gifUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                    aria-label="Open GIF in new tab"
                    title="Open GIF in new tab"
                  >
                    <span className="material-icons text-lg">open_in_new</span>
                  </a>
                </div>
              </div>
              <div
                className="flex min-h-[400px] items-center justify-center rounded-lg bg-gray-100"
                style={{
                  backgroundImage: `
                    linear-gradient(45deg, #e5e7eb 25%, transparent 25%),
                    linear-gradient(-45deg, #e5e7eb 25%, transparent 25%),
                    linear-gradient(45deg, transparent 75%, #e5e7eb 75%),
                    linear-gradient(-45deg, transparent 75%, #e5e7eb 75%)
                  `,
                  backgroundSize: '20px 20px',
                  backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- dynamic GIF URL */}
                <img
                  src={gifUrl}
                  alt="Generated GIF"
                  className="max-h-full max-w-full"
                  onLoad={e => {
                    const img = e.currentTarget;
                    if (onImageLoad) {
                      onImageLoad({
                        width: img.naturalWidth,
                        height: img.naturalHeight,
                      });
                    }
                  }}
                />
              </div>
            </div>
          ) : (
            <ThemePreviewSlide
              theme={
                themePreview ??
                defaultPreviewTheme ?? {
                  accentColor: null,
                  backgroundColor: null,
                  titleFontColor: null,
                  bodyFontColor: null,
                }
              }
              themeName={themePreviewName ?? defaultPreviewName ?? 'Preview'}
              bodyText={
                themePreview != null ? undefined : emptyStateBodyMessage
              }
            />
          )}
        </div>
      </div>

      {/* Timeline */}
      <div>
        <h4 className="mb-2 text-sm font-medium text-gray-700">
          {timelineTitle}
        </h4>
        <Timeline
          selectedSlides={selectedSlides}
          draggedIndex={draggedIndex}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDrop={onDrop}
          onDragEnd={onDragEnd}
          onRemove={onRemove}
          reorderOnly={reorderOnly}
          disabled={disabled}
          placeholderSlides={placeholderSlides}
          placeholderTheme={placeholderTheme}
        />
      </div>
    </div>
  );
}

const DEFAULT_TITLE_COLOR = '#0f172a';
const DEFAULT_BODY_COLOR = '#475569';

function GeneratingSlide({theme}: {theme: MarkdownSlideTheme}) {
  const bg = theme.backgroundColor ?? '#ffffff';
  const accent = theme.accentColor ?? null;
  const textColor = theme.bodyFontColor ?? DEFAULT_BODY_COLOR;
  return (
    <div
      className="relative flex w-full flex-col rounded-lg overflow-hidden border border-gray-200"
      style={{
        minHeight: 400,
        backgroundColor: bg,
        backgroundImage: accent
          ? `linear-gradient(to bottom, ${accent} 0%, ${accent} 8%, transparent 8%)`
          : undefined,
      }}
    >
      {accent && (
        <div
          className="absolute left-0 right-0 top-0 h-2"
          style={{backgroundColor: accent}}
        />
      )}
      <div className="flex min-h-[400px] flex-1 flex-col items-center justify-center gap-2">
        <LoadingSpinner size="lg" />
        <span className="text-sm" style={{color: textColor}}>
          Generating GIF...
        </span>
      </div>
    </div>
  );
}

function ThemePreviewSlide({
  theme,
  themeName,
  bodyText,
}: {
  theme: MarkdownSlideTheme;
  themeName: string;
  bodyText?: string;
}) {
  const bg = theme.backgroundColor ?? '#ffffff';
  const accent = theme.accentColor ?? null;
  const titleColor = theme.titleFontColor ?? accent ?? DEFAULT_TITLE_COLOR;
  const bodyColor = theme.bodyFontColor ?? DEFAULT_BODY_COLOR;
  const body =
    bodyText ??
    `Some body text here. This is how your slide will look with the ${themeName} theme.`;

  return (
    <div
      className="relative flex w-full flex-col rounded-lg overflow-hidden border border-gray-200"
      style={{
        minHeight: 400,
        backgroundColor: bg,
        backgroundImage: accent
          ? `linear-gradient(to bottom, ${accent} 0%, ${accent} 8%, transparent 8%)`
          : undefined,
      }}
    >
      {accent && (
        <div
          className="absolute left-0 right-0 top-0 h-2"
          style={{backgroundColor: accent}}
        />
      )}
      <div className="flex flex-col gap-2 px-5 pt-12">
        <div className="font-bold text-2xl" style={{color: titleColor}}>
          Example Title
        </div>
        <p className="text-sm leading-relaxed" style={{color: bodyColor}}>
          {body}
        </p>
      </div>
    </div>
  );
}
