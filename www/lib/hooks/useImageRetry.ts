import {useState, useEffect} from 'react';

const INITIAL_RETRY_DELAY = 2000; // Start with 2 seconds
const MAX_RETRY_DELAY = 32000; // Cap at 32 seconds

export interface UseImageRetryReturn {
  imageMountKey: Map<string, number>;
  imageRetryAttempts: Map<string, number>;
  failedImages: Set<string>;
  setFailedImages: React.Dispatch<React.SetStateAction<Set<string>>>;
  handleImageLoad: (objectId: string) => void;
  handleImageError: (objectId: string) => void;
}

/**
 * Hook to manage image retry logic with exponential backoff
 */
export function useImageRetry(
  fileId: string | string[] | undefined,
  isLoadingSlidesIncrementally: boolean
): UseImageRetryReturn {
  const [imageMountKey, setImageMountKey] = useState<Map<string, number>>(
    new Map()
  );
  const [imageRetryAttempts, setImageRetryAttempts] = useState<
    Map<string, number>
  >(new Map());
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  // Auto-remount failed images with exponential backoff
  useEffect(() => {
    if (!fileId || failedImages.size === 0 || isLoadingSlidesIncrementally) {
      return;
    }

    const failedObjectIds = Array.from(failedImages);
    const timers: ReturnType<typeof setTimeout>[] = [];

    // Schedule remount for each failed image with exponential backoff
    failedObjectIds.forEach(objectId => {
      const retryAttempt = imageRetryAttempts.get(objectId) || 0;

      // Calculate exponential backoff delay: 2s, 4s, 8s, 16s, 32s
      const delay = Math.min(
        INITIAL_RETRY_DELAY * Math.pow(2, retryAttempt),
        MAX_RETRY_DELAY
      );

      console.log(
        `Scheduling remount for ${objectId} in ${delay}ms (attempt ${retryAttempt + 1})`
      );

      const timer = setTimeout(() => {
        console.log(`Remounting ${objectId} (attempt ${retryAttempt + 1})...`);

        // Clear failed state
        setFailedImages(prev => {
          const updated = new Set(prev);
          updated.delete(objectId);
          return updated;
        });

        // Increment retry attempts
        setImageRetryAttempts(prev => {
          const updated = new Map(prev);
          updated.set(objectId, retryAttempt + 1);
          return updated;
        });

        // Increment mount key to force React to unmount and remount the image
        setImageMountKey(prev => {
          const updated = new Map(prev);
          updated.set(objectId, (updated.get(objectId) || 0) + 1);
          return updated;
        });
      }, delay);

      timers.push(timer);
    });

    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [failedImages, fileId, isLoadingSlidesIncrementally, imageRetryAttempts]);

  const handleImageLoad = (objectId: string) => {
    // Reset retry attempts on successful load
    setImageRetryAttempts(prev => {
      const updated = new Map(prev);
      updated.delete(objectId);
      return updated;
    });
  };

  const handleImageError = (objectId: string) => {
    // On error, mark as failed (will trigger remount after delay)
    setFailedImages(prev => new Set(prev).add(objectId));
  };

  return {
    imageMountKey,
    imageRetryAttempts,
    failedImages,
    setFailedImages,
    handleImageLoad,
    handleImageError,
  };
}
