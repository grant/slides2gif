import React from 'react';
import {GifConfig} from '../../lib/hooks/useGifGeneration';

interface GifPreviewProps {
  gifUrl: string | null;
  gifConfig: GifConfig | null;
  gifDimensions: {width: number; height: number} | null;
  isGenerating: boolean;
  onImageLoad?: (dimensions: {width: number; height: number}) => void;
}

export function GifPreview({
  gifUrl,
  gifConfig,
  gifDimensions,
  isGenerating,
  onImageLoad,
}: GifPreviewProps) {
  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="mb-4">
        <h4 className="mb-2 text-sm font-medium text-gray-700">
          Generated GIF
        </h4>
        <div className="rounded-lg border border-gray-300 bg-white p-4">
          {isGenerating ? (
            <div className="flex min-h-[400px] items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"></div>
                <p className="text-xs text-gray-600">Generating...</p>
              </div>
            </div>
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
                  backgroundPosition:
                    '0 0, 0 10px, 10px -10px, -10px 0px',
                }}
              >
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
            <div className="flex min-h-[400px] items-center justify-center text-sm text-gray-500">
              No GIF generated yet. Select slides and click "GENERATE GIF".
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
