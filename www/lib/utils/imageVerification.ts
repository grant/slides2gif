import {Slide} from '../apiFetcher';

/**
 * Verifies that slide image URLs are accessible before showing them
 */
export async function verifySlideUrls(
  slides: Slide[],
  onReady: () => void
): Promise<void> {
  const slidesWithUrls = slides.filter(s => s.thumbnailUrl);

  if (slidesWithUrls.length === 0) {
    // No URLs to verify, show immediately
    onReady();
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
    onReady();
  } else {
    // Wait a bit more for network/GCS propagation
    setTimeout(() => onReady(), 500);
  }
}
