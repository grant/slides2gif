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
}: GifControlsProps) {
  return (
    <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
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
  );
}
