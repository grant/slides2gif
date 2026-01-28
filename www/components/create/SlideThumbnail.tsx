import React from 'react';
import {LoadingSpinner} from '../LoadingSpinner';
import {Slide} from '../../lib/apiFetcher';

interface SlideThumbnailProps {
  slide: Slide;
  index: number;
  isSelected: boolean;
  isLoaded: boolean;
  showPlaceholder: boolean;
  imageMountKey: number;
  hasFailed: boolean;
  retryAttempt: number;
  onSelect: () => void;
  onLoad: () => void;
  onError: () => void;
}

export function SlideThumbnail({
  slide,
  index,
  isSelected,
  isLoaded,
  showPlaceholder,
  imageMountKey,
  hasFailed,
  retryAttempt,
  onSelect,
  onLoad,
  onError,
}: SlideThumbnailProps) {
  // Don't render image if it has failed - show spinner instead
  const shouldShowImage = !hasFailed;
  return (
    <div
      onClick={onSelect}
      className={`relative cursor-pointer overflow-hidden rounded border-2 transition-all ${
        isSelected
          ? 'border-blue-500 ring-2 ring-blue-200'
          : 'border-gray-200 hover:border-blue-300'
      }`}
    >
      {slide.thumbnailUrl ? (
        <>
          {showPlaceholder && shouldShowImage && (
            <div className="absolute inset-0 bg-gray-100"></div>
          )}
          {shouldShowImage ? (
            <img
              key={`${slide.objectId}-${imageMountKey}`}
              src={`${slide.thumbnailUrl}${
                slide.thumbnailUrl.includes('?') ? '&' : '?'
              }t=${imageMountKey}`}
              alt={`Slide ${index + 1}`}
              className={`block aspect-video w-full bg-gray-100 object-cover transition-opacity duration-300 ${
                isLoaded ? 'opacity-100' : 'opacity-0 shimmer'
              }`}
              loading="lazy"
              onLoad={onLoad}
              onError={onError}
            />
          ) : (
            <div className="relative flex aspect-video w-full items-center justify-center bg-gray-100">
              <LoadingSpinner size="sm" />
            </div>
          )}
          <div className="absolute bottom-1 right-1 rounded bg-black/60 px-1 py-0.5 text-[10px] font-medium text-white">
            {index + 1}
          </div>
        </>
      ) : (
        <div className="relative flex aspect-video w-full items-center justify-center bg-gray-100">
          {slide.error ? (
            <div className="flex flex-col items-center gap-2">
              <LoadingSpinner size="sm" />
              <span className="text-[10px] text-gray-500">Retrying...</span>
            </div>
          ) : (
            <LoadingSpinner size="sm" />
          )}
          <div className="absolute bottom-1 right-1 rounded bg-black/60 px-1 py-0.5 text-[10px] font-medium text-white">
            {index + 1}
          </div>
        </div>
      )}
    </div>
  );
}
