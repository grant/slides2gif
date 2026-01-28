import {SWRConfiguration} from 'swr';

/**
 * Base fetcher function for API requests
 * Handles errors and provides consistent error structure
 */
export async function apiFetcher<T = any>(url: string): Promise<T> {
  const res = await fetch(url);

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const error = new Error(
      errorData.error || 'An error occurred while fetching the data.'
    );
    (error as any).status = res.status;
    (error as any).info = errorData;
    throw error;
  }

  return res.json();
}

/**
 * Simple fetcher for basic API requests (used by SWR)
 * Compatible with SWR's fetcher signature
 */
export const fetcher = <T = any>(url: string): Promise<T> => {
  return apiFetcher<T>(url);
};

/**
 * POST request helper for API calls
 */
export async function apiPost<T = any>(url: string, body: any): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const error = new Error(
      errorData.error || 'An error occurred while making the request.'
    );
    (error as any).status = res.status;
    (error as any).info = errorData;
    throw error;
  }

  return res.json();
}

/**
 * SWR configuration for dashboard data
 * Prevents unnecessary refetches when switching tabs
 */
export const dashboardSWRConfig: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  revalidateIfStale: false,
  dedupingInterval: 300000, // 5 minutes
  refreshInterval: 0,
};

/**
 * SWR configuration for presentation metadata
 */
export const presentationMetadataSWRConfig: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  revalidateIfStale: true,
};

/**
 * SWR configuration for presentations list
 */
export const presentationsSWRConfig: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  revalidateIfStale: true,
};

/**
 * Type definitions for API responses
 */
export interface DashboardStats {
  gifsCreated: number;
  presentationsLoaded: number;
  totalSlidesProcessed: number;
  gifs: Array<{
    url: string;
    createdAt: number;
    presentationId?: string;
  }>;
}

export interface PresentationMetadata {
  id: string;
  title: string;
  locale?: string;
  revisionId?: string;
  slideCount: number;
  slideObjectIds?: string[];
}

export interface Slide {
  objectId: string;
  thumbnailUrl: string | null;
  width: number | null;
  height: number | null;
  cached?: boolean;
  error?: string;
}

export interface SlidesData {
  slides: Slide[];
  rateLimit?: {
    remaining: number;
    resetTime: number;
  };
}

export interface Presentation {
  id: string;
  name: string;
  thumbnailLink?: string;
  firstSlidePreview?: string;
  modifiedTime?: string;
  createdTime?: string;
}

export interface PresentationsResponse {
  presentations: Presentation[];
}
