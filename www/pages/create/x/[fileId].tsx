import Head from 'next/head';
import Layout, {siteTitle} from '../../../components/layout';
import useSWR from 'swr';
import React, {useState, useEffect} from 'react';
import {useRouter} from 'next/router';
import {useAuth} from '../../../lib/useAuth';
import {LoadingScreen} from '../../../components/LoadingScreen';
import {LoadingSpinner} from '../../../components/LoadingSpinner';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const error = new Error('An error occurred while fetching the data.');
    throw error;
  }
  return res.json();
};

interface Slide {
  objectId: string;
  thumbnailUrl: string | null;
  width: number | null;
  height: number | null;
  cached?: boolean;
  error?: string;
}

interface PresentationMetadata {
  id: string;
  title: string;
  locale?: string;
  revisionId?: string;
  slideCount: number;
}

interface SlidesData {
  slides: Slide[];
  rateLimit?: {
    remaining: number;
    resetTime: number;
  };
}

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
  const [generatedGifs, setGeneratedGifs] = useState<
    Array<{
      gifUrl: string;
      timestamp: number;
      thumbnailSize: 'SMALL' | 'MEDIUM' | 'LARGE';
      delay: number;
      quality: string;
      frameCount: number;
    }>
  >([]);
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
    fetcher
  );

  // Load slides after metadata is loaded
  const {
    data: slidesData,
    error: slidesError,
    isValidating: isValidatingSlides,
    mutate: mutateSlides,
  } = useSWR<SlidesData>(
    fileId && metadata ? `/api/presentation/${fileId}/slides` : null,
    fetcher
  );

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
      const response = await fetch(`/api/presentation/${fileId}/refetch`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to refetch');
      }

      const result = await response.json();

      // Refetch the slides data to get updated cached URLs
      await mutateSlides();

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

      const response = await fetch('/api/generate-gif', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          presentationId: fileId,
          slideList,
          delay: gifDelay,
          quality: gifQuality === 'Best' ? 1 : gifQuality === 'HQ' ? 5 : 10,
          thumbnailSize,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate GIF');
      }

      const result = await response.json();
      const newGifUrl = result.gifUrl;

      // Add to generated GIFs list
      const newGif = {
        gifUrl: newGifUrl,
        timestamp: Date.now(),
        thumbnailSize,
        delay: gifDelay,
        quality: gifQuality,
        frameCount: selectedSlides.length,
      };
      setGeneratedGifs(prev => [newGif, ...prev]); // Add to beginning of list
      setGifUrl(newGifUrl);
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
      window.location.href = '/login';
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
            onClick={() => router.push('/create')}
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

            {/* GIF Frames Section */}
            <div className="mb-8">
              <div className="mb-5 flex items-center justify-between">
                <h4 className="text-xl text-gray-800">GIF Frames</h4>
                {selectedSlides.length > 0 && (
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <label
                        htmlFor="gif-delay"
                        className="text-sm text-gray-600"
                      >
                        Delay (ms):
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
                        className="w-20 rounded border border-gray-300 px-2 py-1 text-sm"
                        disabled={isGeneratingGif}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label
                        htmlFor="gif-quality"
                        className="text-sm text-gray-600"
                      >
                        Quality:
                      </label>
                      <select
                        id="gif-quality"
                        value={gifQuality}
                        onChange={e =>
                          setGifQuality(e.target.value as 'Best' | 'HQ' | 'LQ')
                        }
                        className="rounded border border-gray-300 px-2 py-1 text-sm"
                        disabled={isGeneratingGif}
                      >
                        <option value="Best">Best</option>
                        <option value="HQ">HQ</option>
                        <option value="LQ">LQ</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <label
                        htmlFor="thumbnail-size"
                        className="text-sm text-gray-600"
                      >
                        Size:
                      </label>
                      <select
                        id="thumbnail-size"
                        value={thumbnailSize}
                        onChange={e =>
                          setThumbnailSize(
                            e.target.value as 'SMALL' | 'MEDIUM' | 'LARGE'
                          )
                        }
                        className="rounded border border-gray-300 px-2 py-1 text-sm"
                        disabled={isGeneratingGif}
                      >
                        <option value="SMALL">Small (200px)</option>
                        <option value="MEDIUM">Medium (800px)</option>
                        <option value="LARGE">Large (1600px)</option>
                      </select>
                    </div>
                    <button
                      onClick={handleGenerateGif}
                      disabled={isGeneratingGif}
                      className="rounded bg-blue px-4 py-2 text-sm text-white transition-colors hover:bg-blue/90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isGeneratingGif ? (
                        <span>Generating...</span>
                      ) : (
                        <span>Generate GIF</span>
                      )}
                    </button>
                  </div>
                )}
              </div>
              {selectedSlides.length === 0 ? (
                <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center">
                  <p className="mb-2 text-base text-gray-600">
                    No frames selected yet
                  </p>
                  <p className="text-sm text-gray-500">
                    Click on any slide below to add it to your GIF timeline
                  </p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-3">
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
                      className={`group relative cursor-move overflow-hidden rounded-lg border-2 bg-white shadow-sm transition-all duration-200 hover:border-blue hover:shadow-md ${
                        draggedIndex === index
                          ? 'border-blue opacity-50'
                          : 'border-gray-300'
                      }`}
                    >
                      {selectedSlide.thumbnailUrl ? (
                        <img
                          src={selectedSlide.thumbnailUrl}
                          alt={`Frame ${index + 1}`}
                          className="block h-[112px] w-[200px] rounded-lg bg-gray-100 object-cover"
                        />
                      ) : (
                        <div className="flex h-[112px] w-[200px] items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-500">
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

            {/* GIF Preview Section - Shows currently generating GIF */}
            {isGeneratingGif && (
              <div className="mb-8">
                <h4 className="mb-5 text-xl text-gray-800">GIF Preview</h4>
                <div className="rounded-lg border-2 border-gray-300 bg-white p-4 shadow-sm">
                  <div className="flex min-h-[200px] items-center justify-center">
                    <div className="flex flex-col items-center gap-3">
                      <LoadingSpinner size="lg" />
                      <p className="text-sm text-gray-600">Generating GIF...</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Generated GIFs Section - Shows all generated GIFs */}
            {generatedGifs.length > 0 && (
              <div className="mb-8">
                <h4 className="mb-5 text-xl text-gray-800">Generated GIFs</h4>
                <div className="space-y-4">
                  {generatedGifs.map((gif, index) => (
                    <div
                      key={`${gif.timestamp}-${index}`}
                      className="rounded-lg border-2 border-gray-300 bg-white p-4 shadow-sm"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">
                            {new Date(gif.timestamp).toLocaleString()}
                          </span>
                          <span className="ml-2">
                            • {gif.frameCount}{' '}
                            {gif.frameCount === 1 ? 'frame' : 'frames'} •{' '}
                            {gif.thumbnailSize} • {gif.delay}ms delay •{' '}
                            {gif.quality} quality
                          </span>
                        </div>
                      </div>
                      <img
                        src={gif.gifUrl}
                        alt={`Generated GIF ${index + 1}`}
                        className="mx-auto rounded"
                        style={{
                          maxWidth:
                            gif.thumbnailSize === 'LARGE'
                              ? '1600px'
                              : gif.thumbnailSize === 'MEDIUM'
                              ? '800px'
                              : '200px',
                          width: '100%',
                          height: 'auto',
                        }}
                        onLoad={e => {
                          const img = e.target as HTMLImageElement;
                          console.log('Generated GIF loaded:', {
                            naturalWidth: img.naturalWidth,
                            naturalHeight: img.naturalHeight,
                            thumbnailSize: gif.thumbnailSize,
                            timestamp: gif.timestamp,
                          });
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="mb-5 flex items-center justify-between">
                <h4 className="flex items-center gap-2 text-xl text-gray-800">
                  <span>Slides ({metadata.slideCount})</span>
                  {isLoadingSlides && <LoadingSpinner size="sm" />}
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
              {slidesError && (
                <div className="mb-4 rounded bg-red-50 p-3 text-sm text-red-600">
                  Failed to load slides: {slidesError.message}
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
