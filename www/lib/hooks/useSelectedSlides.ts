import {useState} from 'react';

export interface SelectedSlide {
  slideIndex: number;
  objectId: string;
  thumbnailUrl: string | null;
}

export interface UseSelectedSlidesReturn {
  selectedSlides: SelectedSlide[];
  setSelectedSlides: React.Dispatch<React.SetStateAction<SelectedSlide[]>>;
  draggedIndex: number | null;
  setDraggedIndex: React.Dispatch<React.SetStateAction<number | null>>;
  handleSlideSelect: (
    slideIndex: number,
    objectId: string,
    thumbnailUrl: string | null
  ) => void;
  handleSlideDeselect: (objectId: string) => void;
  handleDragStart: (index: number) => void;
  handleDragOver: (e: React.DragEvent, index: number) => void;
  handleDrop: (index: number) => void;
}

/**
 * Hook to manage selected slides state and drag/drop logic
 */
export function useSelectedSlides(): UseSelectedSlidesReturn {
  const [selectedSlides, setSelectedSlides] = useState<SelectedSlide[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleSlideSelect = (
    slideIndex: number,
    objectId: string,
    thumbnailUrl: string | null
  ) => {
    setSelectedSlides(prev => [
      ...prev,
      {
        slideIndex,
        objectId,
        thumbnailUrl,
      },
    ]);
  };

  const handleSlideDeselect = (objectId: string) => {
    setSelectedSlides(prev => prev.filter(s => s.objectId !== objectId));
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null) return;

    const newSlides = [...selectedSlides];
    const draggedSlide = newSlides[draggedIndex];
    newSlides.splice(draggedIndex, 1);
    newSlides.splice(index, 0, draggedSlide);
    setSelectedSlides(newSlides);
    setDraggedIndex(index);
  };

  const handleDrop = (_index: number) => {
    setDraggedIndex(null);
  };

  return {
    selectedSlides,
    setSelectedSlides,
    draggedIndex,
    setDraggedIndex,
    handleSlideSelect,
    handleSlideDeselect,
    handleDragStart,
    handleDragOver,
    handleDrop,
  };
}
