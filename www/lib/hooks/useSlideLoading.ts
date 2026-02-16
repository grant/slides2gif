import {useState, useEffect, useCallback} from 'react';
import {Slide, PresentationMetadata} from '../apiFetcher';

interface SlideLoadingProgress {
  successful: number;
  total: number;
}

export interface UseSlideLoadingReturn {
  incrementalSlides: Slide[];
  isLoadingSlidesIncrementally: boolean;
  slidesLoadingProgress: SlideLoadingProgress;
  failedSlideIndices: Set<number>;
  handleRefetch: () => Promise<void>;
  isRefetching: boolean;
}

/**
 * Hook to manage incremental slide loading with adaptive rate limiting
 */
export function useSlideLoading(
  fileId: string | string[] | undefined,
  metadata: PresentationMetadata | undefined,
  slideObjectIds: string[]
): UseSlideLoadingReturn {
  const [incrementalSlides, setIncrementalSlides] = useState<Slide[]>([]);
  const [isLoadingSlidesIncrementally, setIsLoadingSlidesIncrementally] =
    useState(false);
  const [slidesLoadingProgress, setSlidesLoadingProgress] = useState({
    successful: 0,
    total: 0,
  });
  const [failedSlideIndices, setFailedSlideIndices] = useState<Set<number>>(
    new Set()
  );
  const [isRefetching, setIsRefetching] = useState(false);

  // Load slides incrementally after we have the objectIds
  useEffect(() => {
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
              `/api/presentations/${fileId}/slides/incremental?objectId=${encodeURIComponent(
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- incrementalSlides/isLoading excluded to avoid re-running during load
  }, [fileId, metadata, slideObjectIds]);

  const handleRefetch = useCallback(async () => {
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
              `/api/presentations/${fileId}/slides/incremental?objectId=${encodeURIComponent(
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
    } catch (error: unknown) {
      console.error('Error refetching:', error);
    } finally {
      setIsRefetching(false);
      setIsLoadingSlidesIncrementally(false);
    }
  }, [fileId, isRefetching, failedSlideIndices, slideObjectIds]);

  // Auto-retry failed slides after a delay
  useEffect(() => {
    if (
      !fileId ||
      isRefetching ||
      failedSlideIndices.size === 0 ||
      isLoadingSlidesIncrementally
    ) {
      return;
    }

    // Wait 3 seconds before auto-retrying failed slides
    const retryTimer = setTimeout(() => {
      console.log(`Auto-retrying ${failedSlideIndices.size} failed slides...`);
      handleRefetch();
    }, 3000);

    return () => clearTimeout(retryTimer);
  }, [
    failedSlideIndices.size,
    fileId,
    isRefetching,
    isLoadingSlidesIncrementally,
    handleRefetch,
  ]);

  return {
    incrementalSlides,
    isLoadingSlidesIncrementally,
    slidesLoadingProgress,
    failedSlideIndices,
    handleRefetch,
    isRefetching,
  };
}
