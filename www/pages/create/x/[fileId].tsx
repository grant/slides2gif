import Head from 'next/head';
import Layout, {siteTitle} from '../../../components/layout';
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
    loaded: 0,
    total: 0,
  });
  const [slideObjectIds, setSlideObjectIds] = useState<string[]>([]);

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
      const totalSlides = slideObjectIds.length;
      setSlidesLoadingProgress({loaded: 0, total: totalSlides});

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
        const batchEnd = Math.min(batchStart + batchSize, slideObjectIds.length);
        const batch = slideObjectIds.slice(batchStart, batchEnd);

        // Load all slides in this batch in parallel
        const batchPromises = batch.map(async (objectId, batchIndex) => {
          const i = batchStart + batchIndex;
          if (!objectId) return {success: false, rateLimited: false};

          try {
            const slideResponse = await fetch(
              `/api/presentation/${fileId}/slides/incremental?objectId=${encodeURIComponent(objectId)}&index=${i}`
            );

            if (slideResponse.ok) {
              const slideData = await slideResponse.json();
              // Check if response indicates rate limiting
              const isRateLimited = slideData.error === 'Rate limited' || slideData.error === 'API rate limit exceeded';
              
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
                setSlidesLoadingProgress(prev => ({
                  ...prev,
                  loaded: prev.loaded + 1,
                }));
                return {success: false, rateLimited: true};
              }

              // Update the specific slide in the array
              setIncrementalSlides(prev => {
                const updated = [...prev];
                updated[i] = slideData;
                return updated;
              });
              setSlidesLoadingProgress(prev => ({
                ...prev,
                loaded: prev.loaded + 1,
              }));
              return {success: true, rateLimited: false};
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
              setSlidesLoadingProgress(prev => ({
                ...prev,
                loaded: prev.loaded + 1,
              }));
              return {success: false, rateLimited: isRateLimited};
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
            setSlidesLoadingProgress(prev => ({
              ...prev,
              loaded: prev.loaded + 1,
            }));
            return {success: false, rateLimited: false};
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
          console.log(`Rate limited detected. Backing off: batchSize=${batchSize}, delay=${batchDelay}ms`);
          
          // If heavily rate limited, wait longer before next batch
          if (rateLimitedCount > batchSize / 2) {
            await new Promise(resolve => setTimeout(resolve, batchDelay * 2));
          }
        } else if (successCount === batch.length && consecutiveRateLimits === 0) {
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
    if (!fileId || isRefetching) return;

    setIsRefetching(true);

    try {
      const result = await apiPost<{succeeded: number; failed: number}>(
        `/api/presentation/${fileId}/refetch`,
        {}
      );

      // Reload slides after refetch
      setIncrementalSlides([]);
      setSlideObjectIds([]);
      setIsLoadingSlidesIncrementally(false);

      alert(
        `Refetch complete! ${result.succeeded} succeeded, ${result.failed} failed.`
      );
    } catch (error: any) {
      console.error('Error refetching:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsRefetching(false);
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

  if (userError || !userData) {
    return (
      <Layout>
        <LoadingScreen fullScreen message="Loading..." />
      </Layout>
    );
  }

  if (!userData.isLoggedIn) {
    if (typeof window !== 'undefined') {
      window.location.href = Routes.LOGIN;
    }
    return (
      <Layout>
        <div>Redirecting...</div>
      </Layout>
    );
  }

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
      <div className="p-5">
        <div className="mb-4 flex items-center gap-4">
          <button
            onClick={() => router.push(Routes.CREATE)}
            className="flex items-center gap-2 rounded border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
          >
            <span className="material-icons text-base">arrow_back</span>
            Back to Presentations
          </button>
          <h2 className="m-0">
            SLIDES2GIF <span>– Create GIF</span>
          </h2>
        </div>

        {isLoadingMetadata && (
          <LoadingScreen message="Loading presentation metadata..." />
        )}

        {metadataError && (
          <div className="py-10 px-5 text-center">
            <p className="text-base text-red-600">
              Failed to load presentation metadata. Please try again.
            </p>
          </div>
        )}

        {metadata && (
          <div className="py-5">
            <div className="mb-8 border-b border-gray-300 pb-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="mb-2.5 text-[28px] text-gray-800">
                    {metadata.title}
                  </h3>
                  <p className="my-1 text-sm text-gray-600">
                    Presentation ID: {metadata.id}
                  </p>
                  <p className="my-1">
                    <a
                      href={`https://docs.google.com/presentation/d/${metadata.id}/edit`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue hover:underline"
                    >
                      Open in Google Slides →
                    </a>
                  </p>
                  {metadata.locale && (
                    <p className="my-1 text-sm text-gray-600">
                      Locale: {metadata.locale}
                    </p>
                  )}
                  {metadata.revisionId && (
                    <p className="my-1 text-sm text-gray-600">
                      Revision: {metadata.revisionId}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Two-column layout: GIF Frames (left) and Generated GIF (right) */}
            <div className="mb-6 flex flex-col gap-6 lg:flex-row lg:items-start">
              {/* Left Column: GIF Frames */}
              <div className="flex-1 min-w-0">
                <div className="mb-4 flex items-center justify-between">
                  <h4 className="text-xl text-gray-800">GIF Frames</h4>
                  {selectedSlides.length > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-600">
                        {selectedSlides.length}{' '}
                        {selectedSlides.length === 1 ? 'frame' : 'frames'}
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Controls Card */}
                {selectedSlides.length > 0 && (
                  <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="flex flex-col gap-1">
                        <label
                          htmlFor="gif-delay"
                          className="text-xs font-medium text-gray-700"
                        >
                          Delay (ms)
                        </label>
                        <input
                          id="gif-delay"
                          type="number"
                          min="10"
                          max="10000"
                          step="10"
                          value={gifDelay}
                          onChange={e =>
                            setGifDelay(parseInt(e.target.value) || 1000)
                          }
                          className="rounded border border-gray-300 px-2 py-1.5 text-sm"
                          disabled={isGeneratingGif}
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label
                          htmlFor="gif-quality"
                          className="text-xs font-medium text-gray-700"
                        >
                          Quality
                        </label>
                        <select
                          id="gif-quality"
                          value={gifQuality}
                          onChange={e =>
                            setGifQuality(e.target.value as 'Best' | 'HQ' | 'LQ')
                          }
                          className="rounded border border-gray-300 px-2 py-1.5 text-sm"
                          disabled={isGeneratingGif}
                        >
                          <option value="Best">Best</option>
                          <option value="HQ">HQ</option>
                          <option value="LQ">LQ</option>
                        </select>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label
                          htmlFor="thumbnail-size"
                          className="text-xs font-medium text-gray-700"
                        >
                          Size
                        </label>
                        <select
                          id="thumbnail-size"
                          value={thumbnailSize}
                          onChange={e =>
                            setThumbnailSize(
                              e.target.value as 'SMALL' | 'MEDIUM' | 'LARGE'
                            )
                          }
                          className="rounded border border-gray-300 px-2 py-1.5 text-sm"
                          disabled={isGeneratingGif}
                        >
                          <option value="SMALL">Small (200px)</option>
                          <option value="MEDIUM">Medium (800px)</option>
                          <option value="LARGE">Large (1600px)</option>
                        </select>
                      </div>
                      <div className="flex flex-col gap-1 sm:col-span-2 lg:col-span-1">
                        <label className="text-xs font-medium text-gray-700">
                          &nbsp;
                        </label>
                        <button
                          onClick={handleGenerateGif}
                          disabled={isGeneratingGif}
                          className="w-full rounded bg-blue px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue/90 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isGeneratingGif ? (
                            <span>Generating...</span>
                          ) : (
                            <span>Generate GIF</span>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Selected Frames */}
                {selectedSlides.length === 0 ? (
                  <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-6 text-center">
                    <p className="mb-1 text-sm text-gray-600">
                      No frames selected yet
                    </p>
                    <p className="text-xs text-gray-500">
                      Click on any slide below to add it to your GIF timeline
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 overflow-x-auto pb-2">
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
                          if (draggedIndex !== null && draggedIndex !== index) {
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
                        className={`group relative flex-shrink-0 cursor-move overflow-hidden rounded-lg border-2 bg-white shadow-sm transition-all duration-200 hover:border-blue hover:shadow-md ${
                          draggedIndex === index
                            ? 'border-blue opacity-50'
                            : 'border-gray-300'
                        }`}
                      >
                        {selectedSlide.thumbnailUrl ? (
                          <img
                            src={selectedSlide.thumbnailUrl}
                            alt={`Frame ${index + 1}`}
                            className="block h-[100px] w-[180px] rounded-lg bg-gray-100 object-cover"
                          />
                        ) : (
                          <div className="flex h-[100px] w-[180px] items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-500">
                            No preview
                          </div>
                        )}
                        <div className="absolute top-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
                          {index + 1}
                        </div>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setSelectedSlides(
                              selectedSlides.filter((_, i) => i !== index)
                            );
                          }}
                          className="absolute top-1 right-1 hidden rounded-full bg-red-500 p-1 text-white opacity-0 transition-opacity group-hover:block group-hover:opacity-100"
                          aria-label="Remove frame"
                          type="button"
                        >
                          <svg
                            className="h-3 w-3"
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
                )}
              </div>

              {/* Right Column: Generated GIF */}
              <div className="w-full lg:w-80 lg:flex-shrink-0">
                <div className="sticky top-5">
                  <h4 className="mb-4 text-xl text-gray-800">Generated GIF</h4>
                  <div className="rounded-lg border-2 border-gray-300 bg-white p-4 shadow-sm">
                    {isGeneratingGif ? (
                      <div className="flex min-h-[250px] items-center justify-center">
                        <div className="flex flex-col items-center gap-3">
                          <LoadingSpinner size="lg" />
                          <p className="text-sm text-gray-600">Generating GIF...</p>
                        </div>
                      </div>
                    ) : gifUrl && currentGifConfig ? (
                      <div>
                        <div className="mb-3 text-sm text-gray-600">
                          <div className="font-medium">
                            {currentGifConfig.frameCount}{' '}
                            {currentGifConfig.frameCount === 1
                              ? 'frame'
                              : 'frames'}
                          </div>
                          <div className="text-xs">
                            {currentGifConfig.thumbnailSize} •{' '}
                            {currentGifConfig.delay}ms delay •{' '}
                            {currentGifConfig.quality} quality
                          </div>
                        </div>
                        <img
                          src={gifUrl}
                          alt="Generated GIF"
                          className="w-full rounded"
                          style={{
                            maxWidth: '100%',
                            height: 'auto',
                          }}
                        />
                      </div>
                    ) : (
                      <div className="flex min-h-[250px] items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50">
                        <div className="text-center px-4">
                          <p className="mb-2 text-sm text-gray-600">
                            No GIF generated yet
                          </p>
                          <p className="text-xs text-gray-500">
                            Select slides and click "Generate GIF" to create one
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Slides Grid - Full Width */}
            <div className="mt-6">
              <div className="mb-5 flex items-center justify-between">
                <h4 className="flex items-center gap-2 text-xl text-gray-800">
                  <span>
                    Slides ({metadata.slideCount})
                    {isLoadingSlidesIncrementally &&
                      slidesLoadingProgress.total > 0 && (
                        <span className="ml-2 text-sm font-normal text-gray-500">
                          ({slidesLoadingProgress.loaded}/
                          {slidesLoadingProgress.total} loaded)
                        </span>
                      )}
                  </span>
                  {isLoadingSlidesIncrementally && (
                    <div className="flex items-center gap-2">
                      <LoadingSpinner size="sm" />
                      {slidesLoadingProgress.total > 0 && (
                        <div className="h-2 w-32 overflow-hidden rounded-full bg-gray-200">
                          <div
                            className="h-full bg-blue transition-all duration-300"
                            style={{
                              width: `${
                                (slidesLoadingProgress.loaded /
                                  slidesLoadingProgress.total) *
                                100
                              }%`,
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </h4>
                <button
                  onClick={handleRefetch}
                  disabled={isRefetching}
                  className="rounded border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isRefetching ? (
                    <span>Refetching...</span>
                  ) : (
                    <span>Refetch All Slides</span>
                  )}
                </button>
              </div>
              {slidesLoadingProgress.total > 0 &&
                slidesLoadingProgress.loaded < slidesLoadingProgress.total &&
                !isLoadingSlidesIncrementally && (
                  <div className="mb-4 rounded bg-yellow-50 p-3 text-sm text-yellow-700">
                    Some slides failed to load. Try refreshing the page.
                  </div>
                )}
              {isRefetching && (
                <div className="mb-4">
                  <p className="mb-2 text-sm text-gray-600">
                    Refetching slides gradually to avoid rate limits... This may
                    take a few minutes.
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
                      <div className="h-full w-full animate-pulse bg-blue" />
                    </div>
                    <span className="text-xs text-gray-500">Processing...</span>
                  </div>
                </div>
              )}
              {(slidesData && slidesData.slides.length > 0) ||
              isLoadingSlides ? (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4 py-5">
                  {isLoadingSlides && !slidesData
                    ? // Show skeleton placeholders while loading
                      Array.from({length: metadata.slideCount || 10}).map(
                        (_, index) => (
                          <div
                            key={`skeleton-${index}`}
                            className="relative h-[112px] overflow-hidden rounded-lg border-2 border-gray-300 bg-white shadow-sm"
                          >
                            <div className="h-full w-full bg-gray-100 shimmer"></div>
                          </div>
                        )
                      )
                    : slidesData
                    ? slidesData.slides.map((slide, index) => {
                        const isLoaded = loadedImages.has(slide.objectId);
                        const showPlaceholder =
                          (!isLoaded && slide.thumbnailUrl) || !imagesReady;

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
                            className="relative cursor-pointer overflow-hidden rounded-lg border-2 border-gray-300 bg-white shadow-sm transition-all duration-200 hover:scale-105 hover:border-blue hover:shadow-lg"
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
                                      alt={`Slide ${index + 1} of ${
                                        metadata.title
                                      }`}
                                      className={`block h-[112px] w-full bg-gray-100 object-cover transition-opacity duration-300 ${
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
                                        console.error(
                                          `Failed to load image for slide ${
                                            index + 1
                                          }:`,
                                          slide.thumbnailUrl
                                        );
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
                                  <div className="relative flex h-[112px] w-full items-center justify-center bg-gray-100 text-xs text-gray-500">
                                    <div className="text-[10px] text-red-500">
                                      Failed to load
                                    </div>
                                  </div>
                                )}
                                <div className="absolute top-1 right-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
                                  {index + 1}
                                </div>
                              </>
                            ) : (
                              <div className="relative flex h-[112px] w-full items-center justify-center bg-gray-100 text-xs text-gray-500">
                                {slide.error ? (
                                  <div className="text-center">
                                    <div className="text-[10px] text-red-500">
                                      {slide.error}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="h-[112px] w-full bg-gray-100 shimmer"></div>
                                )}
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
        )}
      </div>
    </Layout>
  );
}
