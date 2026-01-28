import React from 'react';
import {SelectedSlide} from '../../lib/hooks/useSelectedSlides';

interface TimelineProps {
  selectedSlides: SelectedSlide[];
  draggedIndex: number | null;
  onDragStart: (index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDrop: (index: number) => void;
  onDragEnd: () => void;
  onRemove: (index: number) => void;
}

export function Timeline({
  selectedSlides,
  draggedIndex,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onRemove,
}: TimelineProps) {
  if (selectedSlides.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-4 text-center">
        <p className="text-xs text-gray-500">Select slides to add to timeline</p>
      </div>
    );
  }

  return (
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
              onDragStart(index);
              e.dataTransfer.effectAllowed = 'move';
            }}
            onDragOver={e => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              if (draggedIndex !== null && draggedIndex !== index) {
                e.currentTarget.style.opacity = '0.5';
              }
              onDragOver(e, index);
            }}
            onDragLeave={e => {
              e.currentTarget.style.opacity = '1';
            }}
            onDrop={e => {
              e.preventDefault();
              e.currentTarget.style.opacity = '1';
              onDrop(index);
            }}
            onDragEnd={() => {
              onDragEnd();
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
                onRemove(index);
              }}
              className="absolute top-0.5 right-0.5 hidden rounded-full bg-red-500 p-1 text-white opacity-0 transition-all group-hover:block group-hover:opacity-100 hover:scale-110"
              aria-label="Remove frame"
              type="button"
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
