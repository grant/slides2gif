import React from 'react';
import {LoadingSpinner} from './LoadingSpinner';

interface LoadingScreenProps {
  message?: string;
  fullScreen?: boolean;
  className?: string;
}

export function LoadingScreen({
  message = 'Loading...',
  fullScreen = false,
  className = '',
}: LoadingScreenProps) {
  const containerClasses = fullScreen
    ? 'flex min-h-screen items-center justify-center'
    : 'flex min-h-[60vh] items-center justify-center py-5';

  return (
    <div className={`${containerClasses} ${className}`}>
      <div className="flex flex-col items-center gap-3">
        <LoadingSpinner size="lg" />
        <p className="text-sm text-gray-600">{message}</p>
      </div>
    </div>
  );
}
