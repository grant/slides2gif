'use client';

import {useState, useCallback, useMemo} from 'react';
import {useAuth} from '../../../lib/useAuth';
import {LoadingScreen} from '../../../components/LoadingScreen';
import {GifControls} from '../../../components/create/GifControls';
import {GifPreview} from '../../../components/create/GifPreview';
import {Timeline} from '../../../components/create/Timeline';
import type {SelectedSlide} from '../../../lib/hooks/useGifGeneration';
import {useGifGeneration} from '../../../lib/hooks/useGifGeneration';
import {
  THEME_PRESETS,
  getRandomTheme,
  type MarkdownSlideTheme,
} from '../../../lib/markdownTheme';
import {EXAMPLE_MARKDOWN} from './exampleMarkdown';
import {MarkdownEditor} from './MarkdownEditor';

const DEFAULT_MARKDOWN = `---
# This is a title slide

## Your name here

---
# Section title slide

---
# Title & body slide

This is the slide body.
`;

interface MarkdownSlide {
  objectId: string;
  contentHash: string;
  thumbnailUrl: string | null;
}

function splitSlideBlocks(md: string): string[] {
  const trimmed = md.trim();
  if (!trimmed) return [];
  return trimmed
    .split(/\n---\s*\n/)
    .map(b => b.trim())
    .filter(Boolean);
}

function joinSlideBlocks(blocks: string[]): string {
  return blocks.join('\n---\n');
}

export default function CreateMarkdownClient() {
  const {userData, isLoading: isLoadingUser} = useAuth();
  const [markdown, setMarkdown] = useState(DEFAULT_MARKDOWN);
  const [slideBlocks, setSlideBlocks] = useState<string[]>(() =>
    splitSlideBlocks(DEFAULT_MARKDOWN)
  );
  const [presentationId, setPresentationId] = useState<string | null>(null);
  const [slides, setSlides] = useState<MarkdownSlide[]>([]);
  const [isPreparing, setIsPreparing] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [themePresetId, setThemePresetId] = useState('default');
  const [accentOverride, setAccentOverride] = useState<string | null>(null);
  const [backgroundColorOverride, setBackgroundColorOverride] = useState<
    string | null
  >(null);
  const [titleFontColorOverride, setTitleFontColorOverride] = useState<
    string | null
  >(null);
  const [bodyFontColorOverride, setBodyFontColorOverride] = useState<
    string | null
  >(null);
  const [hoveredPreset, setHoveredPreset] = useState<{
    name: string;
    theme: MarkdownSlideTheme;
  } | null>(null);
  const [randomThemeOverride, setRandomThemeOverride] =
    useState<MarkdownSlideTheme | null>(null);

  const theme = useMemo<MarkdownSlideTheme>(() => {
    const preset =
      THEME_PRESETS.find(p => p.id === themePresetId) ?? THEME_PRESETS[0];
    const base =
      themePresetId === 'random' && randomThemeOverride != null
        ? randomThemeOverride
        : preset.theme;
    return {
      accentColor: accentOverride ?? base.accentColor,
      backgroundColor: backgroundColorOverride ?? base.backgroundColor,
      titleFontColor: titleFontColorOverride ?? base.titleFontColor,
      bodyFontColor: bodyFontColorOverride ?? base.bodyFontColor,
    };
  }, [
    themePresetId,
    randomThemeOverride,
    accentOverride,
    backgroundColorOverride,
    titleFontColorOverride,
    bodyFontColorOverride,
  ]);

  const {
    gifDelay,
    setGifDelay,
    gifQuality,
    setGifQuality,
    thumbnailSize,
    setThumbnailSize,
    isGeneratingGif,
    gifUrl,
    gifDimensions,
    setGifDimensions,
    currentGifConfig,
    clearGif,
    handleGenerateGif,
  } = useGifGeneration();

  const selectedSlides: SelectedSlide[] = slides.map((s, i) => ({
    slideIndex: i,
    objectId: s.objectId,
    thumbnailUrl: s.thumbnailUrl,
  }));

  const syncMarkdownToSlides = useCallback(async (): Promise<{
    presentationId: string;
    slides: MarkdownSlide[];
  } | null> => {
    try {
      setSlides([]);
      const syncRes = await fetch('/api/markdown/sync', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        credentials: 'include',
        body: JSON.stringify({markdown, theme}),
      });
      if (!syncRes.ok) {
        const data = await syncRes.json().catch(() => ({}));
        throw new Error((data as {error?: string}).error || syncRes.statusText);
      }
      const syncData = (await syncRes.json()) as {
        presentationId: string;
        slides: {objectId: string; contentHash: string}[];
      };
      setPresentationId(syncData.presentationId);
      const slidesFromSync = syncData.slides;
      if (slidesFromSync.length === 0) {
        setSlides([]);
        setSlideBlocks(splitSlideBlocks(markdown));
        return null;
      }
      const thumbRes = await fetch('/api/markdown/thumbnails', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        credentials: 'include',
        body: JSON.stringify({
          presentationId: syncData.presentationId,
          slides: slidesFromSync,
          size: thumbnailSize,
          theme,
        }),
      });
      if (!thumbRes.ok) {
        throw new Error('Failed to load thumbnails');
      }
      const thumbData = (await thumbRes.json()) as {
        slides: {objectId: string; thumbnailUrl: string | null}[];
      };
      const withUrls: MarkdownSlide[] = slidesFromSync.map((s, i) => ({
        ...s,
        thumbnailUrl: thumbData.slides[i]?.thumbnailUrl ?? null,
      }));
      setSlides(withUrls);
      setSlideBlocks(splitSlideBlocks(markdown));
      return {presentationId: syncData.presentationId, slides: withUrls};
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
      return null;
    }
  }, [markdown, thumbnailSize, theme]);

  const handleDrop = useCallback(
    (dropIndex: number) => {
      if (draggedIndex === null || draggedIndex === dropIndex) return;
      const newBlocks = [...slideBlocks];
      const newSlides = [...slides];
      const [removedBlock] = newBlocks.splice(draggedIndex, 1);
      const [removedSlide] = newSlides.splice(draggedIndex, 1);
      newBlocks.splice(dropIndex, 0, removedBlock);
      newSlides.splice(dropIndex, 0, removedSlide);
      setSlideBlocks(newBlocks);
      setSlides(newSlides);
      setMarkdown(joinSlideBlocks(newBlocks));
      setDraggedIndex(null);
    },
    [draggedIndex, slideBlocks, slides]
  );

  const handleGenerateGifClick = useCallback(async () => {
    if (!markdown.trim()) {
      alert('Please enter some markdown (use --- to separate slides).');
      return;
    }
    setIsPreparing(true);
    try {
      const result = await syncMarkdownToSlides();
      if (!result || result.slides.length === 0) {
        alert(
          'No slides to generate. Add at least one slide (separate with ---).'
        );
        return;
      }
      const {presentationId: pid, slides: slideList} = result;
      const sel: SelectedSlide[] = slideList.map((s, i) => ({
        slideIndex: i,
        objectId: s.objectId,
        thumbnailUrl: s.thumbnailUrl,
      }));
      await handleGenerateGif(pid, sel, {
        contentHashList: slideList.map(s => s.contentHash),
        theme,
      });
    } finally {
      setIsPreparing(false);
    }
  }, [markdown, syncMarkdownToSlides, handleGenerateGif, theme]);

  const handleResetCache = useCallback(async () => {
    setIsResetting(true);
    try {
      const res = await fetch('/api/markdown/cache/clear', {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to clear cache');
      setSlides([]);
      clearGif();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to clear cache');
    } finally {
      setIsResetting(false);
    }
  }, [clearGif]);

  if (isLoadingUser) {
    return <LoadingScreen fullScreen message="Loading..." />;
  }

  if (userData && !userData.isLoggedIn) {
    return <LoadingScreen fullScreen message="Redirecting to login..." />;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="flex w-1/2 flex-col border-r border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-4 py-3">
          <h2 className="text-lg font-semibold text-gray-800">Markdown</h2>
          <p className="mt-1 text-xs text-gray-500">
            Use --- to separate slides. Supports # title, ## subtitle, and body
            text.{' '}
            <button
              type="button"
              onClick={() => setMarkdown(EXAMPLE_MARKDOWN)}
              className="text-blue-600 underline hover:no-underline"
            >
              Click to see full example
            </button>
          </p>

          <section className="mt-4">
            <div
              className="rounded p-1 -m-1"
              onMouseLeave={() => setHoveredPreset(null)}
            >
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Customization
              </h3>
              <div className="mt-2 grid grid-cols-10 gap-1">
                {THEME_PRESETS.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    title={p.name}
                    onMouseEnter={() =>
                      setHoveredPreset({
                        name: p.name,
                        theme:
                          p.id === 'random' && randomThemeOverride != null
                            ? randomThemeOverride
                            : p.theme,
                      })
                    }
                    onClick={() => {
                      setThemePresetId(p.id);
                      setAccentOverride(null);
                      setBackgroundColorOverride(null);
                      setTitleFontColorOverride(null);
                      setBodyFontColorOverride(null);
                      if (p.id === 'random') {
                        setRandomThemeOverride(getRandomTheme());
                      } else {
                        setRandomThemeOverride(null);
                      }
                    }}
                    className={`relative flex aspect-square w-full items-stretch justify-center overflow-hidden rounded border-2 transition-colors ${
                      themePresetId === p.id
                        ? 'border-blue-500 ring-1 ring-blue-500'
                        : 'border-gray-200 hover:border-gray-400'
                    }`}
                    style={{
                      backgroundColor: p.theme.backgroundColor ?? '#ffffff',
                    }}
                  >
                    {p.id === 'random' ? (
                      <span className="flex h-full w-full items-center justify-center text-2xl font-medium text-gray-500">
                        ?
                      </span>
                    ) : p.theme.accentColor != null ? (
                      <span
                        className="absolute left-0 right-0 top-0 h-1/4"
                        style={{backgroundColor: p.theme.accentColor}}
                      />
                    ) : null}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-600">Accent</label>
                  <input
                    type="color"
                    value={theme.accentColor ?? '#64748b'}
                    onChange={e => setAccentOverride(e.target.value)}
                    className="h-6 w-10 cursor-pointer rounded border border-gray-300"
                    title="Accent bar color"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-600">Background</label>
                  <input
                    type="color"
                    value={theme.backgroundColor ?? '#f8fafc'}
                    onChange={e => setBackgroundColorOverride(e.target.value)}
                    className="h-6 w-10 cursor-pointer rounded border border-gray-300"
                    title="Slide background"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-600">Title font</label>
                  <input
                    type="color"
                    value={theme.titleFontColor ?? '#0f172a'}
                    onChange={e => setTitleFontColorOverride(e.target.value)}
                    className="h-6 w-10 cursor-pointer rounded border border-gray-300"
                    title="Title (H1) font color"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-600">Body font</label>
                  <input
                    type="color"
                    value={theme.bodyFontColor ?? '#475569'}
                    onChange={e => setBodyFontColorOverride(e.target.value)}
                    className="h-6 w-10 cursor-pointer rounded border border-gray-300"
                    title="Body text font color"
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="mt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Markdown Content
            </h3>
          </section>
        </div>
        <div className="flex-1 overflow-hidden p-4 pt-0">
          <MarkdownEditor
            value={markdown}
            onChange={setMarkdown}
            placeholder={`---
# Title slide

## Subtitle or your name

---
# Section title

---
# Main slide title

Body text goes here.
`}
            className="h-full w-full"
          />
        </div>
      </div>

      <div className="flex w-1/2 flex-col bg-gray-50">
        <GifControls
          gifDelay={gifDelay}
          setGifDelay={setGifDelay}
          gifQuality={gifQuality}
          setGifQuality={setGifQuality}
          thumbnailSize={thumbnailSize}
          setThumbnailSize={setThumbnailSize}
          isGeneratingGif={isPreparing || isGeneratingGif}
          selectedSlidesCount={
            markdown.trim() ? Math.max(1, slides.length) : slides.length
          }
          onGenerate={handleGenerateGifClick}
          showReset
          onReset={handleResetCache}
          resetDisabled={isResetting}
        />

        <GifPreview
          gifUrl={gifUrl}
          gifConfig={currentGifConfig}
          gifDimensions={gifDimensions}
          isGenerating={isPreparing || isGeneratingGif}
          onImageLoad={setGifDimensions}
          selectedSlides={selectedSlides}
          draggedIndex={draggedIndex}
          onDragStart={setDraggedIndex}
          onDragOver={() => {}}
          onDrop={handleDrop}
          onDragEnd={() => setDraggedIndex(null)}
          onRemove={() => {}}
          timelineTitle="Timeline Preview"
          reorderOnly
          disabled
          openInSlidesUrl={
            presentationId
              ? `https://docs.google.com/presentation/d/${presentationId}/edit`
              : null
          }
          themePreview={
            hoveredPreset == null
              ? null
              : hoveredPreset.name === 'Random' && randomThemeOverride != null
                ? randomThemeOverride
                : hoveredPreset.theme
          }
          themePreviewName={hoveredPreset?.name ?? null}
          defaultPreviewTheme={theme}
          defaultPreviewName={
            THEME_PRESETS.find(p => p.id === themePresetId)?.name ?? 'Custom'
          }
          emptyStateBodyMessage='Write markdown and click "GENERATE GIF". ↗'
          placeholderSlides={splitSlideBlocks(markdown)}
          placeholderTheme={{
            backgroundColor: theme.backgroundColor,
            accentColor: theme.accentColor,
          }}
        />
      </div>
    </div>
  );
}
