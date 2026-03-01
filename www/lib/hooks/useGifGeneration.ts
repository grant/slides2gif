import {useState} from 'react';
import {api} from '../api/client';
import {PATHS} from '../api/definition';
import type {GenerateGifBody} from '../api/schemas';

export interface GifConfig {
  thumbnailSize: 'SMALL' | 'MEDIUM' | 'LARGE';
  delay: number;
  quality: string;
  frameCount: number;
}

export interface SelectedSlide {
  slideIndex: number;
  objectId: string;
  thumbnailUrl: string | null;
}

export interface UseGifGenerationReturn {
  gifDelay: number;
  setGifDelay: React.Dispatch<React.SetStateAction<number>>;
  gifQuality: 'Best' | 'HQ' | 'LQ';
  setGifQuality: React.Dispatch<React.SetStateAction<'Best' | 'HQ' | 'LQ'>>;
  thumbnailSize: 'SMALL' | 'MEDIUM' | 'LARGE';
  setThumbnailSize: React.Dispatch<
    React.SetStateAction<'SMALL' | 'MEDIUM' | 'LARGE'>
  >;
  isGeneratingGif: boolean;
  gifUrl: string | null;
  gifDimensions: {width: number; height: number} | null;
  setGifDimensions: React.Dispatch<
    React.SetStateAction<{width: number; height: number} | null>
  >;
  currentGifConfig: GifConfig | null;
  clearGif: () => void;
  handleGenerateGif: (
    fileId: string | string[] | undefined,
    selectedSlides: SelectedSlide[],
    options?: {
      contentHashList?: string[];
      theme?: {
        accentColor: string | null;
        backgroundColor: string | null;
        titleFontColor: string | null;
        bodyFontColor: string | null;
      } | null;
    }
  ) => Promise<void>;
}

/**
 * Hook to manage GIF generation state and logic
 */
export function useGifGeneration(): UseGifGenerationReturn {
  const [gifDelay, setGifDelay] = useState<number>(1000);
  const [gifQuality, setGifQuality] = useState<'Best' | 'HQ' | 'LQ'>('Best');
  const [thumbnailSize, setThumbnailSize] = useState<
    'SMALL' | 'MEDIUM' | 'LARGE'
  >('MEDIUM');
  const [isGeneratingGif, setIsGeneratingGif] = useState(false);
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [gifDimensions, setGifDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [currentGifConfig, setCurrentGifConfig] = useState<GifConfig | null>(
    null
  );

  const clearGif = () => {
    setGifUrl(null);
    setGifDimensions(null);
    setCurrentGifConfig(null);
  };

  const handleGenerateGif = async (
    fileId: string | string[] | undefined,
    selectedSlides: SelectedSlide[],
    options?: {
      contentHashList?: string[];
      theme?: {
        accentColor: string | null;
        backgroundColor: string | null;
        titleFontColor: string | null;
        bodyFontColor: string | null;
      } | null;
    }
  ) => {
    if (!fileId || selectedSlides.length === 0) {
      alert('Please select at least one slide to generate a GIF');
      return;
    }

    setIsGeneratingGif(true);
    setGifUrl(null);
    try {
      // Use objectIds instead of slide indices, since files are stored by objectId
      const slideList = selectedSlides.map(slide => slide.objectId).join(',');

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

      const presentationId = typeof fileId === 'string' ? fileId : fileId[0];
      const body: GenerateGifBody = {
        presentationId,
        slideList,
        delay: gifDelay,
        quality: gifQuality === 'Best' ? 1 : gifQuality === 'HQ' ? 5 : 10,
        thumbnailSize,
        ...(options?.contentHashList?.length === selectedSlides.length && {
          contentHashList: options.contentHashList,
        }),
        ...(options?.theme != null && {theme: options.theme}),
      };
      const result = await api.post(PATHS.gifs, body);

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
    } catch (error: unknown) {
      console.error('Error generating GIF:', error);
      alert(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsGeneratingGif(false);
    }
  };

  return {
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
    clearGif,
    handleGenerateGif,
  };
}
