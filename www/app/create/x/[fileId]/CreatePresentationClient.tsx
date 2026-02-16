'use client';

import {useParams} from 'next/navigation';
import DashboardLayout from '../../../../components/DashboardLayout';
import useSWR from 'swr';
import {useState, useEffect, useMemo} from 'react';
import {useAuth} from '../../../../lib/useAuth';
import {LoadingScreen} from '../../../../components/LoadingScreen';
import {
  fetcher,
  presentationMetadataSWRConfig,
  PresentationMetadata,
  SlidesData,
} from '../../../../lib/apiFetcher';
import {useSlideLoading} from '../../../../lib/hooks/useSlideLoading';
import {useImageRetry} from '../../../../lib/hooks/useImageRetry';
import {useGifGeneration} from '../../../../lib/hooks/useGifGeneration';
import {useSelectedSlides} from '../../../../lib/hooks/useSelectedSlides';
import {PresentationHeader} from '../../../../components/create/PresentationHeader';
import {SlideGridHeader} from '../../../../components/create/SlideGridHeader';
import {SlideGrid} from '../../../../components/create/SlideGrid';
import {GifControls} from '../../../../components/create/GifControls';
import {GifPreview} from '../../../../components/create/GifPreview';
export default function CreatePresentationClient() {
  const resolvedParams = useParams();
  const fileId = resolvedParams?.fileId as string | undefined;

  const {userData, error: _userError, isLoading: isLoadingUser} = useAuth();

  const {
    data: metadata,
    error: metadataError,
    isValidating: isValidatingMetadata,
  } = useSWR<PresentationMetadata>(
    fileId ? `/api/presentations/${fileId}/metadata` : null,
    fetcher,
    presentationMetadataSWRConfig
  );

  const [slideObjectIds, setSlideObjectIds] = useState<string[]>([]);
  useEffect(() => {
    if (metadata?.slideObjectIds && metadata.slideObjectIds.length > 0) {
      setSlideObjectIds(metadata.slideObjectIds);
    }
  }, [metadata]);

  const {
    incrementalSlides,
    isLoadingSlidesIncrementally,
    slidesLoadingProgress,
    failedSlideIndices,
    handleRefetch,
    isRefetching,
  } = useSlideLoading(fileId, metadata, slideObjectIds);

  const {
    imageMountKey,
    imageRetryAttempts,
    failedImages,
    handleImageLoad,
    handleImageError,
  } = useImageRetry(fileId, isLoadingSlidesIncrementally);

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
    handleGenerateGif,
  } = useGifGeneration();

  const {
    selectedSlides,
    setSelectedSlides,
    draggedIndex,
    setDraggedIndex,
    handleSlideSelect,
    handleDragStart,
    handleDragOver,
    handleDrop,
  } = useSelectedSlides();

  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [imagesReady, setImagesReady] = useState(false);

  useEffect(() => {
    if (fileId) {
      setLoadedImages(new Set());
      setImagesReady(false);
    }
  }, [fileId]);

  const slidesData: SlidesData | undefined = useMemo(
    () =>
      incrementalSlides.length > 0 ? {slides: incrementalSlides} : undefined,
    [incrementalSlides]
  );

  const allSlidesHaveUrls =
    incrementalSlides.length > 0 &&
    incrementalSlides.every(s => Boolean(s.thumbnailUrl));
  useEffect(() => {
    if (!isLoadingSlidesIncrementally && allSlidesHaveUrls) {
      setImagesReady(true);
    } else if (incrementalSlides.length === 0) {
      setImagesReady(false);
    }
  }, [
    slidesData,
    isLoadingSlidesIncrementally,
    allSlidesHaveUrls,
    incrementalSlides.length,
  ]);

  const onImageLoad = (objectId: string) => {
    setLoadedImages(prev => new Set(prev).add(objectId));
    handleImageLoad(objectId);
  };

  const onImageError = (objectId: string) => {
    setLoadedImages(prev => new Set(prev).add(objectId));
    handleImageError(objectId);
  };

  const onGenerateGif = () => {
    handleGenerateGif(fileId, selectedSlides);
  };

  const onTimelineRemove = (index: number) => {
    setSelectedSlides(selectedSlides.filter((_, i) => i !== index));
  };

  const onTimelineDragEnd = () => {
    setDraggedIndex(null);
  };

  const isLoadingMetadata = !metadata && !metadataError && isValidatingMetadata;
  const isLoadingSlides = !slidesData && isLoadingSlidesIncrementally;

  if (isLoadingUser) {
    return <LoadingScreen fullScreen message="Loading..." />;
  }

  if (userData && !userData.isLoggedIn) {
    return <LoadingScreen fullScreen message="Redirecting to login..." />;
  }

  return (
    <DashboardLayout activeTab="create" initialCollapsed={true}>
      <div className="flex h-screen overflow-hidden">
        {isLoadingMetadata && (
          <div className="flex h-full w-full items-center justify-center">
            <LoadingScreen message="Loading presentation metadata..." />
          </div>
        )}

        {metadataError && (
          <div className="flex h-full w-full items-center justify-center">
            <p className="text-base text-red-600">
              Failed to load presentation metadata. Please try again.
            </p>
          </div>
        )}

        {metadata && (
          <>
            <div className="flex w-1/4 flex-col overflow-hidden">
              <PresentationHeader metadata={metadata} />

              <div className="flex-1 overflow-y-auto p-4">
                <SlideGridHeader
                  slideCount={metadata.slideCount}
                  slidesLoadingProgress={slidesLoadingProgress}
                  isLoading={isLoadingSlidesIncrementally}
                  failedSlideCount={failedSlideIndices.size}
                  isRefetching={isRefetching}
                  onRefetch={handleRefetch}
                />
                {slidesLoadingProgress.total > 0 &&
                  slidesLoadingProgress.successful <
                    slidesLoadingProgress.total &&
                  !isLoadingSlidesIncrementally &&
                  failedSlideIndices.size > 0 && (
                    <div className="mb-3 rounded bg-yellow-50 p-2 text-xs text-yellow-700">
                      {failedSlideIndices.size} slide
                      {failedSlideIndices.size !== 1 ? 's' : ''} failed to load.
                      Click &quot;Retry&quot; to reload them.
                    </div>
                  )}
                {(slidesData && slidesData.slides.length > 0) ||
                isLoadingSlides ? (
                  <SlideGrid
                    slides={slidesData?.slides || []}
                    selectedSlides={selectedSlides}
                    loadedImages={loadedImages}
                    imagesReady={imagesReady}
                    failedImages={failedImages}
                    imageMountKey={imageMountKey}
                    imageRetryAttempts={imageRetryAttempts}
                    isLoading={isLoadingSlides}
                    slideCount={metadata.slideCount}
                    onSlideSelect={handleSlideSelect}
                    onImageLoad={onImageLoad}
                    onImageError={onImageError}
                  />
                ) : (
                  <div className="py-10 text-center">
                    <p className="text-sm text-gray-600">No slides found.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex w-3/4 flex-col border-l border-gray-200 bg-gray-50">
              <GifControls
                gifDelay={gifDelay}
                setGifDelay={setGifDelay}
                gifQuality={gifQuality}
                setGifQuality={setGifQuality}
                thumbnailSize={thumbnailSize}
                setThumbnailSize={setThumbnailSize}
                isGeneratingGif={isGeneratingGif}
                selectedSlidesCount={selectedSlides.length}
                onGenerate={onGenerateGif}
              />

              <GifPreview
                gifUrl={gifUrl}
                gifConfig={currentGifConfig}
                gifDimensions={gifDimensions}
                isGenerating={isGeneratingGif}
                onImageLoad={setGifDimensions}
                selectedSlides={selectedSlides}
                draggedIndex={draggedIndex}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onDragEnd={onTimelineDragEnd}
                onRemove={onTimelineRemove}
              />
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
