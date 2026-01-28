import Head from 'next/head';
import Layout, {siteTitle} from '../../../components/layout';
import DashboardLayout from '../../../components/DashboardLayout';
import useSWR from 'swr';
import React, {useState, useEffect} from 'react';
import {useRouter} from 'next/router';
import {useAuth} from '../../../lib/useAuth';
import {LoadingScreen} from '../../../components/LoadingScreen';
import {LoadingSpinner} from '../../../components/LoadingSpinner';
import {Routes} from '../../../lib/routes';
import {
  fetcher,
  apiPost,
  presentationMetadataSWRConfig,
  PresentationMetadata,
  SlidesData,
  Slide,
} from '../../../lib/apiFetcher';

interface SelectedSlide {
  slideIndex: number;
  objectId: string;
  thumbnailUrl: string | null;
}

export default function CreatePresentationDetail() {
  const router = useRouter();
  const {fileId} = router.query;
  const [isRefetching, setIsRefetching] = useState(false);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [imagesReady, setImagesReady] = useState(false);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [selectedSlides, setSelectedSlides] = useState<SelectedSlide[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isGeneratingGif, setIsGeneratingGif] = useState(false);
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [gifDimensions, setGifDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [currentGifConfig, setCurrentGifConfig] = useState<{
    thumbnailSize: 'SMALL' | 'MEDIUM' | 'LARGE';
    delay: number;
    quality: string;
    frameCount: number;
  } | null>(null);
  // GIF configuration options
  const [gifDelay, setGifDelay] = useState<number>(1000); // milliseconds between frames
  const [gifQuality, setGifQuality] = useState<'Best' | 'HQ' | 'LQ'>('Best'); // Quality preset
  const [thumbnailSize, setThumbnailSize] = useState<
    'SMALL' | 'MEDIUM' | 'LARGE'
  >('MEDIUM'); // Thumbnail size for GIF

  // Check authentication - will redirect to login if not authenticated
  const {userData, error: userError, isLoading: isLoadingUser} = useAuth();

  // Load metadata first
  const {
    data: metadata,
    error: metadataError,
    isValidating: isValidatingMetadata,
  } = useSWR<PresentationMetadata>(
    fileId ? `/api/presentation/${fileId}/metadata` : null,
    fetcher,
    presentationMetadataSWRConfig
  );

  // State for incrementally loaded slides
  const [incrementalSlides, setIncrementalSlides] = useState<Slide[]>([]);
  const [isLoadingSlidesIncrementally, setIsLoadingSlidesIncrementally] =
    useState(false);
  const [slidesLoadingProgress, setSlidesLoadingProgress] = useState({
    successful: 0,
    total: 0,
  });
  const [slideObjectIds, setSlideObjectIds] = useState<string[]>([]);
  const [failedSlideIndices, setFailedSlideIndices] = useState<Set<number>>(
    new Set()
  );

  // Get slide objectIds from metadata
  React.useEffect(() => {
    if (metadata?.slideObjectIds && metadata.slideObjectIds.length > 0) {
      setSlideObjectIds(metadata.slideObjectIds);
    }
  }, [metadata]);

  // Load slides incrementally after we have the objectIds
  React.useEffect(() => {
    if (
      !fileId ||
      !metadata ||
      slideObjectIds.length === 0 ||
      incrementalSlides.length > 0 ||
      isLoadingSlidesIncrementally
    )
      return;

    const loadSlidesIncrementally = async () => {
      setIsLoadingSlidesIncrementally(true);
      setIncrementalSlides([]);
      setFailedSlideIndices(new Set());
      const totalSlides = slideObjectIds.length;
      setSlidesLoadingProgress({successful: 0, total: totalSlides});

      // Initialize with placeholder slides
      const placeholderSlides: Slide[] = slideObjectIds.map(objectId => ({
        objectId,
        thumbnailUrl: null,
        width: null,
        height: null,
      }));
      setIncrementalSlides(placeholderSlides);
      setImagesReady(true); // Show placeholders immediately

      // Adaptive loading algorithm
      let batchSize = 15; // Start aggressively with 15 slides at a time
      let batchDelay = 200; // Start with 200ms delay between batches
      let consecutiveRateLimits = 0; // Track consecutive rate limit errors
      const MIN_BATCH_SIZE = 2; // Minimum batch size
      const MAX_BATCH_SIZE = 20; // Maximum batch size
      const MIN_DELAY = 100; // Minimum delay in ms
      const MAX_DELAY = 2000; // Maximum delay in ms

      for (let batchStart = 0; batchStart < slideObjectIds.length; ) {
        const batchEnd = Math.min(
          batchStart + batchSize,
          slideObjectIds.length
        );
        const batch = slideObjectIds.slice(batchStart, batchEnd);

        // Load all slides in this batch in parallel
        const batchPromises = batch.map(async (objectId, batchIndex) => {
          const i = batchStart + batchIndex;
          if (!objectId) return {success: false, rateLimited: false};

          try {
            const slideResponse = await fetch(
              `/api/presentation/${fileId}/slides/incremental?objectId=${encodeURIComponent(
                objectId
              )}&index=${i}`
            );

            if (slideResponse.ok) {
              const slideData = await slideResponse.json();
              // Check if response indicates rate limiting
              const isRateLimited =
                slideData.error === 'Rate limited' ||
                slideData.error === 'API rate limit exceeded';

              if (isRateLimited) {
                // Mark as rate limited
                setIncrementalSlides(prev => {
                  const updated = [...prev];
                  updated[i] = {
                    ...updated[i],
                    error: 'Rate limited',
                  };
                  return updated;
                });
                setFailedSlideIndices(prev => new Set(prev).add(i));
                return {success: false, rateLimited: true, index: i};
              }

              // Update the specific slide in the array
              setIncrementalSlides(prev => {
                const updated = [...prev];
                updated[i] = slideData;
                return updated;
              });
              setSlidesLoadingProgress(prev => ({
                ...prev,
                successful: prev.successful + 1,
              }));
              setFailedSlideIndices(prev => {
                const updated = new Set(prev);
                updated.delete(i);
                return updated;
              });
              return {success: true, rateLimited: false, index: i};
            } else {
              const errorData = await slideResponse.json().catch(() => ({}));
              const isRateLimited =
                slideResponse.status === 429 ||
                errorData.error === 'Rate limited' ||
                errorData.error === 'API rate limit exceeded';

              // If fetch fails, mark as error
              setIncrementalSlides(prev => {
                const updated = [...prev];
                updated[i] = {
                  ...updated[i],
                  error: errorData.error || 'Failed to load',
                };
                return updated;
              });
              setFailedSlideIndices(prev => new Set(prev).add(i));
              return {success: false, rateLimited: isRateLimited, index: i};
            }
          } catch (error) {
            console.error(`Error loading slide ${i}:`, error);
            // Mark as error and continue
            setIncrementalSlides(prev => {
              const updated = [...prev];
              updated[i] = {
                ...updated[i],
                error: 'Failed to load',
              };
              return updated;
            });
            setFailedSlideIndices(prev => new Set(prev).add(i));
            return {success: false, rateLimited: false, index: i};
          }
        });

        // Wait for all slides in this batch to complete
        const results = await Promise.all(batchPromises);

        // Analyze results to adapt batch size and delay
        const rateLimitedCount = results.filter(r => r.rateLimited).length;
        const successCount = results.filter(r => r.success).length;

        if (rateLimitedCount > 0) {
          // Rate limited - back off aggressively
          consecutiveRateLimits++;
          batchSize = Math.max(MIN_BATCH_SIZE, Math.floor(batchSize * 0.5)); // Halve batch size
          batchDelay = Math.min(MAX_DELAY, batchDelay * 2); // Double delay
          console.log(
            `Rate limited detected. Backing off: batchSize=${batchSize}, delay=${batchDelay}ms`
          );

          // If heavily rate limited, wait longer before next batch
          if (rateLimitedCount > batchSize / 2) {
            await new Promise(resolve => setTimeout(resolve, batchDelay * 2));
          }
        } else if (
          successCount === batch.length &&
          consecutiveRateLimits === 0
        ) {
          // All succeeded and no recent rate limits - speed up gradually
          batchSize = Math.min(MAX_BATCH_SIZE, Math.floor(batchSize * 1.2)); // Increase by 20%
          batchDelay = Math.max(MIN_DELAY, Math.floor(batchDelay * 0.9)); // Reduce delay by 10%
        } else {
          // Some failures but not rate limited - reset consecutive counter and maintain current settings
          consecutiveRateLimits = Math.max(0, consecutiveRateLimits - 1);
        }

        // Add delay between batches (except after the last batch)
        if (batchEnd < slideObjectIds.length) {
          await new Promise(resolve => setTimeout(resolve, batchDelay));
        }

        batchStart = batchEnd;
      }

      setIsLoadingSlidesIncrementally(false);
    };

    loadSlidesIncrementally();
  }, [fileId, metadata, slideObjectIds]);

  // Use incremental slides if available
  const slidesData: SlidesData | undefined =
    incrementalSlides.length > 0 ? {slides: incrementalSlides} : undefined;
  const slidesError = undefined; // We handle errors per slide
  const isValidatingSlides = isLoadingSlidesIncrementally;

  // Wait a bit after slides data loads and verify URLs are accessible before showing images
  React.useEffect(() => {
    if (slidesData && slidesData.slides.length > 0) {
      // Verify that URLs are accessible before showing images
      const verifyUrls = async () => {
        const slidesWithUrls = slidesData.slides.filter(s => s.thumbnailUrl);

        if (slidesWithUrls.length === 0) {
          // No URLs to verify, show immediately
          setImagesReady(true);
          return;
        }

        // For cached images, wait a bit longer to ensure GCS files are accessible
        const hasCachedImages = slidesWithUrls.some(s => s.cached);
        const baseDelay = hasCachedImages ? 800 : 300;

        // Check a sample of URLs to verify they're accessible
        const sampleSize = Math.min(3, slidesWithUrls.length);
        const sampleSlides = slidesWithUrls.slice(0, sampleSize);

        // Try to verify URLs are accessible
        const verifyPromises = sampleSlides.map(slide => {
          return new Promise<boolean>(resolve => {
            const img = new Image();
            let resolved = false;

            img.onload = () => {
              if (!resolved) {
                resolved = true;
                resolve(true);
              }
            };

            img.onerror = () => {
              if (!resolved) {
                resolved = true;
                resolve(false);
              }
            };

            // Set src to trigger load
            img.src = slide.thumbnailUrl || '';

            // Timeout after 1.5 seconds
            setTimeout(() => {
              if (!resolved) {
                resolved = true;
                resolve(false);
              }
            }, 1500);
          });
        });

        // Wait for base delay first
        await new Promise(resolve => setTimeout(resolve, baseDelay));

        // Then verify URLs
        const results = await Promise.all(verifyPromises);
        const accessibleCount = results.filter(Boolean).length;

        // If at least one URL is accessible, show images
        // Otherwise wait a bit more and show anyway (might be network issues)
        if (accessibleCount > 0) {
          setImagesReady(true);
        } else {
          // Wait a bit more for network/GCS propagation
          setTimeout(() => setImagesReady(true), 500);
        }
      };

      verifyUrls();
    } else {
      setImagesReady(false);
    }
  }, [slidesData]);

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

  const isLoadingMetadata = !metadata && !metadataError && isValidatingMetadata;
  const isLoadingSlides = !slidesData && !slidesError && isValidatingSlides;

  const handleRefetch = async () => {
    if (!fileId || isRefetching || failedSlideIndices.size === 0) return;

    setIsRefetching(true);
    setIsLoadingSlidesIncrementally(true);

    try {
      // Get list of failed slide indices to retry
      const failedIndices = Array.from(failedSlideIndices).sort(
        (a, b) => a - b
      );
      const failedObjectIds = failedIndices
        .map(i => slideObjectIds[i])
        .filter(Boolean);

      if (failedObjectIds.length === 0) {
        setIsRefetching(false);
        setIsLoadingSlidesIncrementally(false);
        return;
      }

      // Retry failed slides with smaller batches and longer delays
      const batchSize = 5; // Smaller batches for retries
      const batchDelay = 500; // Longer delay for retries

      for (let batchStart = 0; batchStart < failedObjectIds.length; ) {
        const batchEnd = Math.min(
          batchStart + batchSize,
          failedObjectIds.length
        );
        const batch = failedObjectIds.slice(batchStart, batchEnd);

        // Load all slides in this batch in parallel
        const batchPromises = batch.map(async objectId => {
          const originalIndex = slideObjectIds.indexOf(objectId);
          if (originalIndex === -1) return {success: false};

          try {
            const slideResponse = await fetch(
              `/api/presentation/${fileId}/slides/incremental?objectId=${encodeURIComponent(
                objectId
              )}&index=${originalIndex}`
            );

            if (slideResponse.ok) {
              const slideData = await slideResponse.json();

              // Check if response indicates rate limiting
              const isRateLimited =
                slideData.error === 'Rate limited' ||
                slideData.error === 'API rate limit exceeded';

              if (isRateLimited) {
                setIncrementalSlides(prev => {
                  const updated = [...prev];
                  updated[originalIndex] = {
                    ...updated[originalIndex],
                    error: 'Rate limited',
                  };
                  return updated;
                });
                return {success: false};
              }

              // Update the specific slide in the array
              setIncrementalSlides(prev => {
                const updated = [...prev];
                updated[originalIndex] = slideData;
                return updated;
              });
              setSlidesLoadingProgress(prev => ({
                ...prev,
                successful: prev.successful + 1,
              }));
              setFailedSlideIndices(prev => {
                const updated = new Set(prev);
                updated.delete(originalIndex);
                return updated;
              });
              return {success: true};
            } else {
              return {success: false};
            }
          } catch (error) {
            console.error(`Error retrying slide ${originalIndex}:`, error);
            return {success: false};
          }
        });

        await Promise.all(batchPromises);

        // Add delay between batches (except after the last batch)
        if (batchEnd < failedObjectIds.length) {
          await new Promise(resolve => setTimeout(resolve, batchDelay));
        }

        batchStart = batchEnd;
      }
    } catch (error: any) {
      console.error('Error refetching:', error);
    } finally {
      setIsRefetching(false);
      setIsLoadingSlidesIncrementally(false);
    }
  };

  const handleGenerateGif = async () => {
    if (!fileId || selectedSlides.length === 0) {
      alert('Please select at least one slide to generate a GIF');
      return;
    }

    setIsGeneratingGif(true);
    setGifUrl(null);
    try {
      // Use objectIds instead of slide indices, since files are stored by objectId
      const slideList = selectedSlides.map(slide => slide.objectId).join(',');
      console.log('Generating GIF with:', {
        presentationId: fileId,
        selectedSlides: selectedSlides.map(s => ({
          slideIndex: s.slideIndex,
          objectId: s.objectId,
        })),
        slideList,
      });

      // Debug: Verify objectIds are not empty
      if (selectedSlides.some(s => !s.objectId || s.objectId === '')) {
        console.error(
          'ERROR: Some selectedSlides have empty or missing objectId!',
          selectedSlides
        );
        alert(
          'Error: Some slides are missing objectId. Please try selecting slides again.'
        );
        setIsGeneratingGif(false);
        return;
      }

      const result = await apiPost<{gifUrl: string}>('/api/generate-gif', {
        presentationId: fileId,
        slideList,
        delay: gifDelay,
        quality: gifQuality === 'Best' ? 1 : gifQuality === 'HQ' ? 5 : 10,
        thumbnailSize,
      });

      const newGifUrl = result.gifUrl;

      // Update current GIF
      setGifUrl(newGifUrl);
      setGifDimensions(null); // Reset dimensions for new GIF
      setCurrentGifConfig({
        thumbnailSize,
        delay: gifDelay,
        quality: gifQuality,
        frameCount: selectedSlides.length,
      });
    } catch (error: any) {
      console.error('Error generating GIF:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsGeneratingGif(false);
    }
  };

  return (
    <Layout>
      <Head key="head">
        <title>
          {metadata?.title || 'Presentation'} - {siteTitle}
        </title>
        <meta
          name="description"
          content={`View and create GIFs from ${
            metadata?.title || 'this Google Slides presentation'
          }. ${metadata?.slideCount || 0} slides available.`}
        />
        <meta
          property="og:title"
          content={`${metadata?.title || 'Presentation'} - ${siteTitle}`}
        />
        <meta
          property="og:description"
          content={`View and create GIFs from ${
            metadata?.title || 'this Google Slides presentation'
          }. ${metadata?.slideCount || 0} slides available.`}
        />
        <meta property="og:type" content="website" />
        <meta
          property="og:url"
          content={`${
            typeof window !== 'undefined' ? window.location.origin : ''
          }/create/x/${fileId}`}
        />
        <meta name="twitter:card" content="summary_large_image" />
        <meta
          name="twitter:title"
          content={`${metadata?.title || 'Presentation'} - ${siteTitle}`}
        />
        <meta
          name="twitter:description"
          content={`View and create GIFs from ${
            metadata?.title || 'this Google Slides presentation'
          }. ${metadata?.slideCount || 0} slides available.`}
        />
        {slidesData?.slides?.[0]?.thumbnailUrl && (
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
                {/* Title and Google Slides Link */}
                <div className="border-b border-gray-200 bg-white px-6 py-4">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-semibold text-gray-800">
                      {metadata.title}
                    </h3>
                    <a
                      href={`https://docs.google.com/presentation/d/${metadata.id}/edit`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-blue-600 hover:text-blue-700"
                      aria-label="Open in Google Slides"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                    </a>
                  </div>
                </div>

                {/* Slides Grid - 3 columns with minimal spacing */}
                <div className="flex-1 overflow-y-auto p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <h4 className="text-sm font-medium text-gray-700">
                      Slides ({metadata.slideCount})
                      {slidesLoadingProgress.total > 0 && (
                        <span className="ml-2 text-xs font-normal text-gray-500">
                          ({slidesLoadingProgress.successful}/
                          {slidesLoadingProgress.total} loaded)
                        </span>
                      )}
                    </h4>
                    {isLoadingSlidesIncrementally && (
                      <div className="flex items-center gap-2">
                        <LoadingSpinner size="sm" />
                        {slidesLoadingProgress.total > 0 && (
                          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-gray-200">
                            <div
                              className="h-full bg-blue transition-all duration-300"
                              style={{
                                width: `${
                                  (slidesLoadingProgress.successful /
                                    slidesLoadingProgress.total) *
                                  100
                                }%`,
                              }}
                            />
                          </div>
                        )}
                      </div>
                    )}
                    {failedSlideIndices.size > 0 &&
                      !isLoadingSlidesIncrementally && (
                        <button
                          onClick={handleRefetch}
                          disabled={isRefetching}
                          className="flex items-center gap-1.5 rounded border border-gray-300 bg-white px-3 py-1 text-xs text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <span
                            className={`material-icons text-sm ${
                              isRefetching ? 'animate-spin' : ''
                            }`}
                          >
                            refresh
                          </span>
                          {isRefetching
                            ? `Retrying ${failedSlideIndices.size}...`
                            : `Retry ${failedSlideIndices.size} failed`}
                        </button>
                      )}
                  </div>
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
                    <div className="grid grid-cols-3 gap-1.5">
                      {isLoadingSlides && !slidesData
                        ? Array.from({length: metadata.slideCount || 10}).map(
                            (_, index) => (
                              <div
                                key={`skeleton-${index}`}
                                className="relative aspect-video overflow-hidden rounded border border-gray-200 bg-gray-100"
                              >
                                <div className="h-full w-full bg-gray-200 shimmer"></div>
                                <div className="absolute bottom-1 right-1 rounded bg-black/60 px-1 py-0.5 text-[10px] font-medium text-white">
                                  {index + 1}
                                </div>
                              </div>
                            )
                          )
                        : slidesData
                        ? slidesData.slides.map((slide, index) => {
                            const isLoaded = loadedImages.has(slide.objectId);
                            const showPlaceholder =
                              (!isLoaded && slide.thumbnailUrl) || !imagesReady;
                            const isSelected = selectedSlides.some(
                              s => s.objectId === slide.objectId
                            );

                            return (
                              <div
                                key={slide.objectId}
                                onClick={() => {
                                  setSelectedSlides([
                                    ...selectedSlides,
                                    {
                                      slideIndex: index,
                                      objectId: slide.objectId,
                                      thumbnailUrl: slide.thumbnailUrl || null,
                                    },
                                  ]);
                                }}
                                className={`relative cursor-pointer overflow-hidden rounded border-2 transition-all ${
                                  isSelected
                                    ? 'border-blue-500 ring-2 ring-blue-200'
                                    : 'border-gray-200 hover:border-blue-300'
                                }`}
                              >
                                {slide.thumbnailUrl ? (
                                  <>
                                    {showPlaceholder && (
                                      <div className="absolute inset-0 bg-gray-100"></div>
                                    )}
                                    {imagesReady &&
                                      slide.thumbnailUrl &&
                                      !failedImages.has(slide.objectId) && (
                                        <img
                                          src={slide.thumbnailUrl}
                                          alt={`Slide ${index + 1}`}
                                          className={`block aspect-video w-full bg-gray-100 object-cover transition-opacity duration-300 ${
                                            isLoaded
                                              ? 'opacity-100'
                                              : 'opacity-0 shimmer'
                                          }`}
                                          loading="lazy"
                                          onLoad={() => {
                                            setLoadedImages(prev =>
                                              new Set(prev).add(slide.objectId)
                                            );
                                          }}
                                          onError={() => {
                                            setFailedImages(prev =>
                                              new Set(prev).add(slide.objectId)
                                            );
                                            setLoadedImages(prev =>
                                              new Set(prev).add(slide.objectId)
                                            );
                                          }}
                                        />
                                      )}
                                    {failedImages.has(slide.objectId) && (
                                      <div className="relative flex aspect-video w-full items-center justify-center bg-gray-100 text-[10px] text-red-500">
                                        Failed
                                      </div>
                                    )}
                                    <div className="absolute bottom-1 right-1 rounded bg-black/60 px-1 py-0.5 text-[10px] font-medium text-white">
                                      {index + 1}
                                    </div>
                                  </>
                                ) : (
                                  <div className="relative flex aspect-video w-full items-center justify-center bg-gray-100 text-[10px] text-gray-500">
                                    {slide.error ? (
                                      <div className="text-red-500">
                                        {slide.error}
                                      </div>
                                    ) : (
                                      <div className="h-full w-full bg-gray-200 shimmer"></div>
                                    )}
                                    <div className="absolute bottom-1 right-1 rounded bg-black/60 px-1 py-0.5 text-[10px] font-medium text-white">
                                      {index + 1}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })
                        : null}
                    </div>
                  ) : (
                    <div className="py-10 text-center">
                      <p className="text-sm text-gray-600">No slides found.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Column 1: Controls, GIF Preview, and Timeline - 3/4 width */}
              <div className="flex w-3/4 flex-col border-l border-gray-200 bg-gray-50">
                {/* Controls bar */}
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
                        onChange={e =>
                          setGifDelay(parseInt(e.target.value) || 1000)
                        }
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
                          setThumbnailSize(
                            e.target.value as 'SMALL' | 'MEDIUM' | 'LARGE'
                          )
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
                    onClick={handleGenerateGif}
                    disabled={isGeneratingGif || selectedSlides.length === 0}
                    className="flex items-center gap-2 rounded-lg bg-[rgba(255,186,68,1)] px-6 py-2.5 text-base font-bold text-[rgb(20,30,50)] shadow-md transition-colors hover:bg-[rgba(255,186,68,0.9)] disabled:bg-gray-400 disabled:cursor-not-allowed disabled:text-gray-600"
                  >
                    <span
                      className={`material-icons text-lg text-[rgb(20,30,50)] ${
                        isGeneratingGif ? 'animate-spin' : ''
                      }`}
                    >
                      {isGeneratingGif ? 'sync' : 'auto_awesome'}
                    </span>
                    <span>
                      {isGeneratingGif ? 'Generating...' : 'GENERATE GIF'}
                    </span>
                  </button>
                </div>

                {/* Generated GIF Preview */}
                <div className="flex-1 overflow-y-auto p-4">
                  <div className="mb-4">
                    <h4 className="mb-2 text-sm font-medium text-gray-700">
                      Generated GIF
                    </h4>
                    <div className="rounded-lg border border-gray-300 bg-white p-4">
                      {isGeneratingGif ? (
                        <div className="flex min-h-[400px] items-center justify-center">
                          <div className="flex flex-col items-center gap-2">
                            <LoadingSpinner size="lg" />
                            <p className="text-xs text-gray-600">
                              Generating...
                            </p>
                          </div>
                        </div>
                      ) : gifUrl && currentGifConfig ? (
                        <div>
                          <div className="mb-2 text-xs text-gray-600">
                            <div className="font-medium">
                              {currentGifConfig.frameCount}{' '}
                              {currentGifConfig.frameCount === 1
                                ? 'frame'
                                : 'frames'}
                            </div>
                            <div className="text-[10px]">
                              {currentGifConfig.thumbnailSize} •{' '}
                              {currentGifConfig.delay}ms •{' '}
                              {currentGifConfig.quality}
                              {gifDimensions && (
                                <>
                                  {' '}
                                  • {gifDimensions.width}×{gifDimensions.height}
                                </>
                              )}
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
                              backgroundPosition:
                                '0 0, 0 10px, 10px -10px, -10px 0px',
                            }}
                          >
                            <img
                              src={gifUrl}
                              alt="Generated GIF"
                              className="rounded"
                              style={{
                                maxWidth: '100%',
                                maxHeight: '100%',
                                width: gifDimensions
                                  ? `${Math.min(gifDimensions.width, 800)}px`
                                  : 'auto',
                                height: gifDimensions
                                  ? `${Math.min(gifDimensions.height, 600)}px`
                                  : 'auto',
                                objectFit: 'contain',
                              }}
                              onLoad={e => {
                                const img = e.currentTarget;
                                setGifDimensions({
                                  width: img.naturalWidth,
                                  height: img.naturalHeight,
                                });
                              }}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="flex min-h-[400px] items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-100">
                          <div className="text-center">
                            <p className="text-xs text-gray-500">
                              No GIF generated yet
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Timeline - Vertical Scroll */}
                  <div>
                    <h4 className="mb-2 text-sm font-medium text-gray-700">
                      Timeline
                    </h4>
                    {selectedSlides.length === 0 ? (
                      <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-4 text-center">
                        <p className="text-xs text-gray-500">
                          Select slides to add to timeline
                        </p>
                      </div>
                    ) : (
                      <div className="max-h-96 overflow-y-auto pr-2">
                        <div
                          className="grid gap-2"
                          style={{
                            gridTemplateColumns: 'repeat(auto-fill, 160px)',
                          }}
                        >
                          {selectedSlides.map((selectedSlide, index) => (
                            <div
                              key={`${selectedSlide.objectId}-${index}`}
                              draggable
                              onDragStart={e => {
                                setDraggedIndex(index);
                                e.dataTransfer.effectAllowed = 'move';
                              }}
                              onDragOver={e => {
                                e.preventDefault();
                                e.dataTransfer.dropEffect = 'move';
                                if (
                                  draggedIndex !== null &&
                                  draggedIndex !== index
                                ) {
                                  e.currentTarget.style.opacity = '0.5';
                                }
                              }}
                              onDragLeave={e => {
                                e.currentTarget.style.opacity = '1';
                              }}
                              onDrop={e => {
                                e.preventDefault();
                                e.currentTarget.style.opacity = '1';
                                if (draggedIndex === null) return;
                                const newSlides = [...selectedSlides];
                                const draggedSlide = newSlides[draggedIndex];
                                newSlides.splice(draggedIndex, 1);
                                newSlides.splice(index, 0, draggedSlide);
                                setSelectedSlides(newSlides);
                                setDraggedIndex(null);
                              }}
                              onDragEnd={() => {
                                setDraggedIndex(null);
                              }}
                              className={`group relative cursor-move overflow-hidden rounded border-2 bg-white transition-all ${
                                draggedIndex === index
                                  ? 'border-blue-500 opacity-50'
                                  : 'border-gray-300 hover:border-blue-400'
                              }`}
                            >
                              {selectedSlide.thumbnailUrl ? (
                                <img
                                  src={selectedSlide.thumbnailUrl}
                                  alt={`Frame ${index + 1}`}
                                  className="block aspect-video w-full bg-gray-100 object-cover"
                                />
                              ) : (
                                <div className="flex aspect-video w-full items-center justify-center bg-gray-100 text-[10px] text-gray-500">
                                  No preview
                                </div>
                              )}
                              <div className="absolute top-0.5 left-0.5 rounded bg-black/70 px-1 py-0.5 text-[9px] font-medium text-white">
                                {index + 1}
                              </div>
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  setSelectedSlides(
                                    selectedSlides.filter((_, i) => i !== index)
                                  );
                                }}
                                className="absolute top-0.5 right-0.5 hidden rounded-full bg-red-500 p-0.5 text-white opacity-0 transition-opacity group-hover:block group-hover:opacity-100"
                                aria-label="Remove frame"
                                type="button"
                              >
                                <svg
                                  className="h-2.5 w-2.5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                  />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </DashboardLayout>
    </Layout>
  );
}
