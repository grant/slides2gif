import React, {useRef, useEffect} from 'react';
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
  retryAttempt: _retryAttempt,
  onSelect,
  onLoad,
  onError,
}: SlideThumbnailProps) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const loadReportedRef = useRef(false);
  const shouldShowImage = !hasFailed;

  // When URL or mount key changes, we get a new img; reset so we can report load once
  useEffect(() => {
    loadReportedRef.current = false;
  }, [slide.thumbnailUrl, imageMountKey]);

  // Cached/sync images can complete before React attaches onLoad. Check after paint and once after a tick.
  useEffect(() => {
    if (!shouldShowImage || !slide.thumbnailUrl || loadReportedRef.current)
      return;
    const checkComplete = () => {
      if (loadReportedRef.current) return;
      const img = imgRef.current;
      if (img?.complete && img.naturalWidth > 0) {
        loadReportedRef.current = true;
        onLoad();
      }
    };
    const id = requestAnimationFrame(() => {
      checkComplete();
      // Cached image may complete in same tick; check again next tick
      setTimeout(checkComplete, 0);
    });
    return () => cancelAnimationFrame(id);
  }, [slide.thumbnailUrl, shouldShowImage, onLoad]);

  const handleLoad = () => {
    if (loadReportedRef.current) return;
    loadReportedRef.current = true;
    onLoad();
  };

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
            // eslint-disable-next-line @next/next/no-img-element -- dynamic thumbnail URL
            <img
              ref={imgRef}
              key={`${slide.objectId}-${slide.thumbnailUrl ?? 'pending'}-${imageMountKey}`}
              src={`${slide.thumbnailUrl}${
                slide.thumbnailUrl.includes('?') ? '&' : '?'
              }t=${imageMountKey}`}
              alt={`Slide ${index + 1}`}
              className={`block aspect-video w-full bg-gray-100 object-cover transition-opacity duration-300 ${
                isLoaded ? 'opacity-100' : 'opacity-0 shimmer'
              }`}
              loading="lazy"
              onLoad={handleLoad}
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
