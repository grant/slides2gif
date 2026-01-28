import React from 'react';
import {LoadingSpinner} from '../LoadingSpinner';

interface SlideGridHeaderProps {
  slideCount: number;
  slidesLoadingProgress: {
    successful: number;
    total: number;
  };
  isLoading: boolean;
  failedSlideCount: number;
  isRefetching: boolean;
  onRefetch: () => void;
}

export function SlideGridHeader({
  slideCount,
  slidesLoadingProgress,
  isLoading,
  failedSlideCount,
  isRefetching,
  onRefetch,
}: SlideGridHeaderProps) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h4 className="text-sm font-medium text-gray-700">
        Slides ({slideCount})
        {slidesLoadingProgress.total > 0 && (
          <span className="ml-2 text-xs font-normal text-gray-500">
            ({slidesLoadingProgress.successful}/{slidesLoadingProgress.total}{' '}
            loaded)
          </span>
        )}
      </h4>
      {isLoading && (
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
      {failedSlideCount > 0 && !isLoading && (
        <button
          onClick={onRefetch}
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
            ? `Retrying ${failedSlideCount}...`
            : `Retry ${failedSlideCount} failed`}
        </button>
      )}
      {slidesLoadingProgress.total > 0 &&
        slidesLoadingProgress.successful < slidesLoadingProgress.total &&
        !isLoading &&
        failedSlideCount > 0 && (
          <div className="mb-3 rounded bg-yellow-50 p-2 text-xs text-yellow-700">
            {failedSlideCount} slide{failedSlideCount !== 1 ? 's' : ''} failed
            to load. Click "Retry" to reload them.
          </div>
        )}
    </div>
  );
}
