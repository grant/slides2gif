import React from 'react';
import {LoadingSpinner} from '../LoadingSpinner';
import {Slide} from '../../lib/apiFetcher';
import {SlideThumbnail} from './SlideThumbnail';
import {SelectedSlide} from '../../lib/hooks/useSelectedSlides';

interface SlideGridProps {
  slides: Slide[];
  selectedSlides: SelectedSlide[];
  loadedImages: Set<string>;
  imagesReady: boolean;
  failedImages: Set<string>;
  imageMountKey: Map<string, number>;
  imageRetryAttempts: Map<string, number>;
  isLoading: boolean;
  slideCount: number;
  onSlideSelect: (
    slideIndex: number,
    objectId: string,
    thumbnailUrl: string | null
  ) => void;
  onImageLoad: (objectId: string) => void;
  onImageError: (objectId: string) => void;
}

export function SlideGrid({
  slides,
  selectedSlides,
  loadedImages,
  imagesReady,
  failedImages,
  imageMountKey,
  imageRetryAttempts,
  isLoading,
  slideCount,
  onSlideSelect,
  onImageLoad,
  onImageError,
}: SlideGridProps) {
  if (isLoading && slides.length === 0) {
    return (
      <div className="grid grid-cols-3 gap-1.5">
        {Array.from({length: slideCount || 10}).map((_, index) => (
          <div
            key={`skeleton-${index}`}
            className="relative aspect-video overflow-hidden rounded border border-gray-200 bg-gray-100"
          >
            <div className="h-full w-full bg-gray-200 shimmer"></div>
            <div className="absolute bottom-1 right-1 rounded bg-black/60 px-1 py-0.5 text-[10px] font-medium text-white">
              {index + 1}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-1.5">
      {slides.map((slide, index) => {
        const isLoaded = loadedImages.has(slide.objectId);
        const showPlaceholder = Boolean(
          ((!isLoaded && slide.thumbnailUrl) || !imagesReady) ?? false
        );
        const isSelected = selectedSlides.some(
          s => s.objectId === slide.objectId
        );

        return (
          <SlideThumbnail
            key={slide.objectId}
            slide={slide}
            index={index}
            isSelected={isSelected}
            isLoaded={isLoaded}
            showPlaceholder={showPlaceholder}
            imageMountKey={imageMountKey.get(slide.objectId) || 0}
            hasFailed={failedImages.has(slide.objectId)}
            retryAttempt={imageRetryAttempts.get(slide.objectId) || 0}
            onSelect={() =>
              onSlideSelect(index, slide.objectId, slide.thumbnailUrl)
            }
            onLoad={() => onImageLoad(slide.objectId)}
            onError={() => onImageError(slide.objectId)}
          />
        );
      })}
    </div>
  );
}
