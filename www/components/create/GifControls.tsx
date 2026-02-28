import React from 'react';

interface GifControlsProps {
  gifDelay: number;
  setGifDelay: (delay: number) => void;
  gifQuality: 'Best' | 'HQ' | 'LQ';
  setGifQuality: (quality: 'Best' | 'HQ' | 'LQ') => void;
  thumbnailSize: 'SMALL' | 'MEDIUM' | 'LARGE';
  setThumbnailSize: (size: 'SMALL' | 'MEDIUM' | 'LARGE') => void;
  isGeneratingGif: boolean;
  selectedSlidesCount: number;
  onGenerate: () => void;
  /** When true, show a RESET button (clear markdown cache) to the left of Generate; only visible on hover, slightly transparent */
  showReset?: boolean;
  onReset?: () => void | Promise<void>;
  /** When true, RESET button is disabled (e.g. clear in progress) */
  resetDisabled?: boolean;
}

export function GifControls({
  gifDelay,
  setGifDelay,
  gifQuality,
  setGifQuality,
  thumbnailSize,
  setThumbnailSize,
  isGeneratingGif,
  selectedSlidesCount,
  onGenerate,
  showReset = false,
  onReset,
  resetDisabled = false,
}: GifControlsProps) {
  return (
    <div className="group/controls flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
      <div className="flex items-center gap-4">
        <div>
          <label className="text-xs text-gray-600">Delay</label>
          <input
            type="number"
            min="10"
            max="10000"
            step="10"
            value={gifDelay}
            onChange={e => setGifDelay(parseInt(e.target.value) || 1000)}
            className="ml-1 h-8 w-16 rounded border border-gray-300 px-2 text-xs"
            disabled={isGeneratingGif}
          />
        </div>
        <div>
          <label className="text-xs text-gray-600">Quality</label>
          <select
            value={gifQuality}
            onChange={e =>
              setGifQuality(e.target.value as 'Best' | 'HQ' | 'LQ')
            }
            className="ml-1 h-8 w-16 rounded border border-gray-300 px-1 text-xs"
            disabled={isGeneratingGif}
          >
            <option value="Best">Best</option>
            <option value="HQ">HQ</option>
            <option value="LQ">LQ</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-600">Size</label>
          <select
            value={thumbnailSize}
            onChange={e =>
              setThumbnailSize(e.target.value as 'SMALL' | 'MEDIUM' | 'LARGE')
            }
            className="ml-1 h-8 w-20 rounded border border-gray-300 px-1 text-xs"
            disabled={isGeneratingGif}
          >
            <option value="SMALL">Small</option>
            <option value="MEDIUM">Medium</option>
            <option value="LARGE">Large</option>
          </select>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {showReset && onReset && (
          <button
            type="button"
            onClick={onReset}
            disabled={isGeneratingGif || resetDisabled}
            className="flex items-center gap-1.5 rounded-lg border border-gray-400 bg-gray-100 px-3 py-2 text-xs font-medium text-gray-600 opacity-25 transition-opacity hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed group-hover/controls:opacity-60"
            title="Clear cached slide thumbnails"
          >
            <span className="material-icons text-sm">delete_sweep</span>
            CLEAR CACHE
          </button>
        )}
        <button
          onClick={onGenerate}
          disabled={isGeneratingGif || selectedSlidesCount === 0}
          className="flex items-center gap-2 rounded-lg bg-[rgba(255,186,68,1)] px-6 py-2.5 text-base font-bold text-[rgb(20,30,50)] shadow-md transition-colors hover:bg-[rgba(255,186,68,0.9)] disabled:bg-gray-400 disabled:cursor-not-allowed disabled:text-gray-600"
        >
          <span
            className={`material-icons text-lg text-[rgb(20,30,50)] ${
              isGeneratingGif ? 'animate-spin' : ''
            }`}
          >
            {isGeneratingGif ? 'sync' : 'auto_awesome'}
          </span>
          <span>{isGeneratingGif ? 'Generating...' : 'GENERATE GIF'}</span>
        </button>
      </div>
    </div>
  );
}
