import Head from 'next/head';
import Layout, {siteTitle} from '../../../components/layout';
import DashboardLayout from '../../../components/DashboardLayout';
import useSWR from 'swr';
import React, {useState, useEffect} from 'react';
import {useRouter} from 'next/router';
import {useAuth} from '../../../lib/useAuth';
import {LoadingScreen} from '../../../components/LoadingScreen';
import {
  fetcher,
  presentationMetadataSWRConfig,
  PresentationMetadata,
  SlidesData,
} from '../../../lib/apiFetcher';
import {useSlideLoading} from '../../../lib/hooks/useSlideLoading';
import {useImageRetry} from '../../../lib/hooks/useImageRetry';
import {useGifGeneration} from '../../../lib/hooks/useGifGeneration';
import {useSelectedSlides} from '../../../lib/hooks/useSelectedSlides';
import {verifySlideUrls} from '../../../lib/utils/imageVerification';
import {PresentationHeader} from '../../../components/create/PresentationHeader';
import {SlideGridHeader} from '../../../components/create/SlideGridHeader';
import {SlideGrid} from '../../../components/create/SlideGrid';
import {GifControls} from '../../../components/create/GifControls';
import {GifPreview} from '../../../components/create/GifPreview';
import {Timeline} from '../../../components/create/Timeline';


export default function CreatePresentationDetail() {
  const router = useRouter();
  const {fileId} = router.query;

  // Authentication
  const {userData, error: userError, isLoading: isLoadingUser} = useAuth();

  // Load metadata
  const {
    data: metadata,
    error: metadataError,
    isValidating: isValidatingMetadata,
  } = useSWR<PresentationMetadata>(
    fileId ? `/api/presentation/${fileId}/metadata` : null,
    fetcher,
    presentationMetadataSWRConfig
  );

  // Extract slide objectIds from metadata
  const [slideObjectIds, setSlideObjectIds] = useState<string[]>([]);
  useEffect(() => {
    if (metadata?.slideObjectIds && metadata.slideObjectIds.length > 0) {
      setSlideObjectIds(metadata.slideObjectIds);
    }
  }, [metadata]);

  // Slide loading hook
  const {
    incrementalSlides,
    isLoadingSlidesIncrementally,
    slidesLoadingProgress,
    failedSlideIndices,
    handleRefetch,
    isRefetching,
  } = useSlideLoading(fileId, metadata, slideObjectIds);

  // Image retry hook
  const {
    imageMountKey,
    imageRetryAttempts,
    failedImages,
    setFailedImages,
    handleImageLoad,
    handleImageError,
  } = useImageRetry(fileId, isLoadingSlidesIncrementally);

  // GIF generation hook
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

  // Selected slides hook
  const {
    selectedSlides,
    setSelectedSlides,
    draggedIndex,
    setDraggedIndex,
    handleSlideSelect,
    handleSlideDeselect,
    handleDragStart,
    handleDragOver,
    handleDrop,
  } = useSelectedSlides();

  // Image ready state
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [imagesReady, setImagesReady] = useState(false);

  // Use incremental slides if available
  const slidesData: SlidesData | undefined =
    incrementalSlides.length > 0 ? {slides: incrementalSlides} : undefined;
  const isValidatingSlides = isLoadingSlidesIncrementally;

  // Verify URLs are accessible before showing images
  useEffect(() => {
    if (slidesData && slidesData.slides.length > 0) {
      verifySlideUrls(slidesData.slides, () => setImagesReady(true));
    } else {
      setImagesReady(false);
    }
  }, [slidesData]);

  // Update loaded images when image loads
  const onImageLoad = (objectId: string) => {
    setLoadedImages(prev => new Set(prev).add(objectId));
    handleImageLoad(objectId);
  };

  const onImageError = (objectId: string) => {
    setLoadedImages(prev => new Set(prev).add(objectId));
    handleImageError(objectId);
  };

  // Generate GIF handler
  const onGenerateGif = () => {
    handleGenerateGif(fileId, selectedSlides);
  };

  // Timeline handlers
  const onTimelineRemove = (index: number) => {
    setSelectedSlides(selectedSlides.filter((_, i) => i !== index));
  };

  const onTimelineDragEnd = () => {
    setDraggedIndex(null);
  };

  // Loading states
  const isLoadingMetadata =
    !metadata && !metadataError && isValidatingMetadata;
  const isLoadingSlides = !slidesData && !isValidatingSlides;

  // Show loading state while checking authentication
  if (isLoadingUser) {
    return (
      <Layout>
        <Head>
          <title>{siteTitle}</title>
        </Head>
        <LoadingScreen fullScreen message="Loading..." />
      </Layout>
    );
  }

  // Show redirecting message if not authenticated (useAuth will handle redirect)
  if (userData && !userData.isLoggedIn) {
    return (
      <Layout>
        <Head>
          <title>{siteTitle}</title>
        </Head>
        <LoadingScreen fullScreen message="Redirecting to login..." />
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>
          {metadata ? `${metadata.title} - ${siteTitle}` : siteTitle}
        </title>
        {slidesData && slidesData.slides.length > 0 && slidesData.slides[0].thumbnailUrl && (
          <meta
            property="og:image"
            content={slidesData.slides[0].thumbnailUrl}
          />
        )}
      </Head>
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
              {/* Column 0: Title and Slides Grid - 1/4 width */}
              <div className="flex w-1/4 flex-col overflow-hidden">
                <PresentationHeader metadata={metadata} />

                {/* Slides Grid */}
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
                        {failedSlideIndices.size !== 1 ? 's' : ''} failed to
                        load. Click "Retry" to reload them.
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

              {/* Column 1: Controls, GIF Preview, and Timeline - 3/4 width */}
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
                />

                {/* Timeline */}
                <div className="px-4 pb-4">
                  <h4 className="mb-2 text-sm font-medium text-gray-700">
                    Timeline
                  </h4>
                  <Timeline
                    selectedSlides={selectedSlides}
                    draggedIndex={draggedIndex}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onDragEnd={onTimelineDragEnd}
                    onRemove={onTimelineRemove}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </DashboardLayout>
    </Layout>
  );
}
