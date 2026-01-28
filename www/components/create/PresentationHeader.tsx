import React from 'react';
import {PresentationMetadata} from '../../lib/apiFetcher';

interface PresentationHeaderProps {
  metadata: PresentationMetadata;
}

export function PresentationHeader({metadata}: PresentationHeaderProps) {
  return (
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
  );
}
