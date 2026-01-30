/**
 * The page for creating GIFs. Holds functionality for multiple page types:
 * - Sign-in: Logging into the app
 * - Create: Creating a GIF from slide images
 * - Import: Importing slide images
 */
import React, {useState, useEffect, useRef} from 'react';
import {APIResUser} from '../types/user';
import useSWR from 'swr';
import {useRouter} from 'next/router';
import {LoadingSpinner} from './LoadingSpinner';
import {Routes} from '../lib/routes';
import {
  fetcher,
  presentationsSWRConfig,
  PresentationsResponse,
  Presentation,
  apiPost,
} from '../lib/apiFetcher';

// const DEFAULT_REDIRECT_URL = 'http://localhost:3000/';

// The current page.
enum PAGE_TYPE {
  CREATE = 'CREATE',
  IMPORT = 'IMPORT',
}

interface PageCreateProps {
  currentPageType: 'CREATE' | 'IMPORT';
  user: APIResUser;
}

/**
 * The SPA page for sign-in, create, and import
 */
export function PageCreate(props: PageCreateProps) {
  const type = PAGE_TYPE.CREATE;
  // const type = PAGE_TYPE.IMPORT;
  // export default function PageCreate({
  //   currentPageType: type,
  //   redirectURL,
  // } = {
  //   currentPageType: PAGE_TYPE.CREATE,
  //   redirectURL: DEFAULT_REDIRECT_URL,
  // }) {

  // const data = await fetcher('/api/user');
  // console.log(data);

  // Redirect to login if no user
  // const {user} = useUser();

  // Return the correct page
  const pageFunction = {
    [PAGE_TYPE.CREATE]: PageCreateGIF,
    [PAGE_TYPE.IMPORT]: PageImportSlides,
  };
  return <section className={type}>{pageFunction[type]()}</section>;
}

/**
 * Page for creating a GIF from slides
 * Shows a grid of presentations to choose from
 */
function PageCreateGIF() {
  const router = useRouter();
  const [loadedThumbnails, setLoadedThumbnails] = useState<Set<string>>(
    new Set()
  );
  const [generatingPreviews, setGeneratingPreviews] = useState<Set<string>>(
    new Set()
  );
  const [loadingCachedPreviews, setLoadingCachedPreviews] = useState<
    Set<string>
  >(new Set());
  const {data, error, mutate} = useSWR<PresentationsResponse>(
    '/api/presentations',
    fetcher,
    presentationsSWRConfig
  );
  const processingQueueRef = useRef<Set<string>>(new Set());
  const isProcessingRef = useRef(false);
  const hasQueuedRef = useRef(false);
  const cacheCheckRequestedRef = useRef<Set<string>>(new Set());

  const handlePresentationClick = (fileId: string) => {
    router.push(Routes.CREATE_PRESENTATION(fileId));
  };

  const isLoading = !data && !error;
  const presentations = data?.presentations || [];

  const CACHE_CHECK_BATCH = 5;

  // Queue: fetch cached previews incrementally (GET, no rate limit) so list stays fast
  useEffect(() => {
    if (!data?.presentations || data.presentations.length === 0) return;

    const idsToCheck = data.presentations
      .filter(
        p =>
          !p.firstSlidePreview &&
          !cacheCheckRequestedRef.current.has(p.id)
      )
      .map(p => p.id);

    if (idsToCheck.length === 0) return;

    const batch = idsToCheck.slice(0, CACHE_CHECK_BATCH);
    batch.forEach(id => cacheCheckRequestedRef.current.add(id));
    setLoadingCachedPreviews(prev => new Set([...prev, ...batch]));

    Promise.all(
      batch.map(id =>
        fetch(`/api/presentation/${id}/cached-preview`)
          .then(res => (res.ok ? res.json() : null))
          .then(
            body =>
              body?.previewUrl ? {id, previewUrl: body.previewUrl} : null
          )
      )
    ).then(results => {
      setLoadingCachedPreviews(prev => {
        const next = new Set(prev);
        batch.forEach(id => next.delete(id));
        return next;
      });
      const updates = results.filter(
        (r): r is {id: string; previewUrl: string} => r != null
      );
      if (updates.length === 0) return;
      mutate(
        currentData => {
          if (!currentData) return currentData;
          return {
            presentations: currentData.presentations.map(p => {
              const u = updates.find(u => u.id === p.id);
              return u ? {...p, firstSlidePreview: u.previewUrl} : p;
            }),
          };
        },
        {revalidate: false}
      );
    });
  }, [data, mutate]);

  // Queue preview generation for presentations without previews (POST, rate limited)
  useEffect(() => {
    if (!data?.presentations) {
      return;
    }

    // Find presentations without previews (exclude ones we're still loading cache for)
    const presentationsWithoutPreviews = data.presentations.filter(
      p =>
        !p.firstSlidePreview &&
        !p.thumbnailLink &&
        !loadingCachedPreviews.has(p.id)
    );

    if (presentationsWithoutPreviews.length === 0) {
      hasQueuedRef.current = false;
      return;
    }

    // Add to queue if not already queued
    let addedToQueue = false;
    presentationsWithoutPreviews.forEach(p => {
      if (
        !processingQueueRef.current.has(p.id) &&
        !generatingPreviews.has(p.id)
      ) {
        processingQueueRef.current.add(p.id);
        addedToQueue = true;
      }
    });

    // Only start processing if we added new items and aren't already processing
    if (!addedToQueue || isProcessingRef.current || hasQueuedRef.current) {
      return;
    }

    hasQueuedRef.current = true;

    // Process queue one at a time
    const processQueue = async () => {
      if (isProcessingRef.current) {
        return;
      }

      isProcessingRef.current = true;

      while (processingQueueRef.current.size > 0) {
        const presentationId = Array.from(processingQueueRef.current)[0];
        processingQueueRef.current.delete(presentationId);

        // Check current state using mutate to get fresh data
        let shouldSkip = false;
        await mutate(
          currentData => {
            const presentation = currentData?.presentations.find(
              p => p.id === presentationId
            );
            if (
              presentation?.firstSlidePreview ||
              presentation?.thumbnailLink
            ) {
              shouldSkip = true;
            }
            return currentData; // Don't modify, just read
          },
          {revalidate: false}
        );

        if (shouldSkip) {
          continue;
        }

        setGeneratingPreviews(prev => new Set(prev).add(presentationId));

        try {
          // Generate preview
          const response = await apiPost<{
            success: boolean;
            previewUrl: string;
            presentationId: string;
          }>(`/api/presentation/${presentationId}/preview`, {});

          if (response.success && response.previewUrl) {
            // Update the SWR cache with the new preview
            mutate(
              currentData => {
                if (!currentData) return currentData;
                return {
                  presentations: currentData.presentations.map(p =>
                    p.id === presentationId
                      ? {...p, firstSlidePreview: response.previewUrl}
                      : p
                  ),
                };
              },
              {revalidate: false}
            );
          }
        } catch (error) {
          const err = error as {status?: number; info?: {retryAfter?: number}};
          if (err?.status === 429) {
            const waitMs = Math.max(
              5000,
              typeof err?.info?.retryAfter === 'number'
                ? err.info.retryAfter
                : 60000
            );
            await new Promise(resolve => setTimeout(resolve, waitMs));
            // Re-queue so we retry this presentation after rate limit resets
            processingQueueRef.current.add(presentationId);
          } else {
            console.error(
              `Failed to generate preview for ${presentationId}:`,
              error
            );
          }
        } finally {
          setGeneratingPreviews(prev => {
            const next = new Set(prev);
            next.delete(presentationId);
            return next;
          });
          // ~4s between requests to stay under 15/min
          await new Promise(resolve => setTimeout(resolve, 4000));
        }
      }

      isProcessingRef.current = false;
      hasQueuedRef.current = false;
    };

    processQueue();
  }, [data, mutate, loadingCachedPreviews]);

  // Skeleton loader component for presentation cards
  const PresentationSkeleton = () => (
    <div className="relative rounded-lg border-2 border-gray-200 bg-white shadow-sm">
      {/* Image skeleton */}
      <div className="h-[140px] w-full animate-pulse bg-gray-200" />
      {/* Title skeleton */}
      <div className="px-3 py-3">
        <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200" />
      </div>
    </div>
  );

  return (
    <>
      <h1 className="mb-8 text-3xl font-bold text-gray-900">
        Choose a presentation
      </h1>
      {isLoading ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-5">
          {[...Array(6)].map((_, index) => (
            <PresentationSkeleton key={`skeleton-${index}`} />
          ))}
        </div>
      ) : error ? (
        <div className="py-10 px-5 text-center">
          <p className="text-base text-red-600">
            {(error as any)?.info?.error ||
              (error as any)?.message ||
              'Failed to load presentations'}
            . Please try again.
          </p>
          {(error as any)?.status === 401 && (
            <p className="mt-2 text-sm text-gray-600">
              You may need to{' '}
              <a href="/login" className="text-blue underline">
                log in again
              </a>
              .
            </p>
          )}
        </div>
      ) : presentations.length === 0 ? (
        <p>No presentations found.</p>
      ) : (
        <>
          {generatingPreviews.size > 0 && (
            <p className="mb-2 text-sm text-gray-500">
              Loaded {presentations.length} presentations
              {' · '}
              Generating previews… ({generatingPreviews.size} in progress)
            </p>
          )}
          <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-5">
          {presentations.map(presentation => {
            const thumbnailUrl =
              presentation.firstSlidePreview || presentation.thumbnailLink;
            const isLoaded = loadedThumbnails.has(presentation.id);
            const showPlaceholder = !isLoaded && thumbnailUrl;

            return (
              <div
                key={presentation.id}
                className="relative cursor-pointer rounded-lg border-2 border-gray-300 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue hover:shadow-md"
                onClick={() => handlePresentationClick(presentation.id)}
              >
                {thumbnailUrl ? (
                  <>
                    {showPlaceholder && (
                      <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-100">
                        <div className="flex flex-col items-center gap-2">
                          <LoadingSpinner size="md" />
                          <span className="text-xs text-gray-500">
                            Loading...
                          </span>
                        </div>
                      </div>
                    )}
                    <div className="relative">
                      <img
                        src={thumbnailUrl}
                        alt={presentation.name}
                        className={`block h-[140px] w-full bg-gray-100 transition-opacity duration-300 ${
                          presentation.firstSlidePreview
                            ? 'object-contain'
                            : 'object-cover'
                        } ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
                        loading="lazy"
                        onLoad={() => {
                          setLoadedThumbnails(prev =>
                            new Set(prev).add(presentation.id)
                          );
                        }}
                        onError={() => {
                          setLoadedThumbnails(prev =>
                            new Set(prev).add(presentation.id)
                          );
                        }}
                      />
                    </div>
                  </>
                ) : (
                  <div className="flex h-[140px] w-full items-center justify-center bg-gray-100 text-sm text-gray-500">
                    {generatingPreviews.has(presentation.id) ? (
                      <div className="flex flex-col items-center gap-2">
                        <LoadingSpinner size="sm" />
                        <span className="text-xs">Generating preview...</span>
                      </div>
                    ) : loadingCachedPreviews.has(presentation.id) ? (
                      <div className="flex flex-col items-center gap-2">
                        <LoadingSpinner size="sm" />
                        <span className="text-xs">Loading...</span>
                      </div>
                    ) : (
                      <div
                        className="h-full w-full"
                        style={{
                          backgroundColor: '#e8e8e8',
                          backgroundImage: `
                            linear-gradient(45deg, #ddd 25%, transparent 25%),
                            linear-gradient(-45deg, #ddd 25%, transparent 25%),
                            linear-gradient(45deg, transparent 75%, #ddd 75%),
                            linear-gradient(-45deg, transparent 75%, #ddd 75%)
                          `,
                          backgroundSize: '16px 16px',
                          backgroundPosition:
                            '0 0, 0 8px, 8px -8px, -8px 0px',
                        }}
                      />
                    )}
                  </div>
                )}
                <div className="truncate px-3 py-3 text-sm font-medium text-gray-800">
                  {presentation.name}
                </div>
              </div>
            );
          })}
          </div>
        </>
      )}
    </>
  );
}
/**
 * Page for importing Slides
 */
function PageImportSlides() {
  interface Presentation {
    title: string;
    id: string;
    link: string;
  }

  const presentationData: Presentation[] = [
    {
      title: 'Presentation 1 Name',
      id: '15WQqNciYxvuRu4x0x4LLtUOeTtWlj1nt2Ir4',
      link: 'http://google.com',
    },
    {
      title: 'Presentation 2 Name',
      id: '15WQqNciYxvuRu4x0x4LLtUOeTtWlj1nt2Ir1',
      link: 'http://google.com',
    },
    {
      title: 'Presentation 3 Name',
      id: '15WQqNciYxvuRu4x0x4LLtUOeTtWlj1nt2Ir2',
      link: 'http://google.com',
    },
  ];

  return PageWrapper({
    pageTitle: 'Import Slides',
    pageContents: (
      <form action="">
        <div className="flex">
          <div className="flex-1">
            <h4 className="text-3xl">Select presentation:</h4>
            <ul>
              {presentationData.map(p => {
                return (
                  <li>
                    <label className="block" htmlFor={p.id}>
                      <input
                        id={p.id}
                        type="checkbox"
                        name="presentation1"
                        value="presentation1"
                      />
                      {p.title} <span>{p.id}</span> <a href={p.link}>LINK</a>
                    </label>
                  </li>
                );
              })}
            </ul>
            <span>
              ID: <input type="text" />
            </span>
          </div>
          <div className="flex-shrink-0 px-2.5" style={{flexBasis: '300px'}}>
            <h3>Config</h3>
            <button className="cursor-pointer rounded border border-black bg-yellow px-5 py-3.5 text-xl font-bold text-black shadow-[0_5px_10px_rgba(55,55,55,0.12)] opacity-95 transition-colors duration-200 hover:bg-yellow/90">
              Import slides
            </button>
          </div>
        </div>
      </form>
    ),
  });
}

// Wraps a page
interface PageOptions {
  pageTitle: string;
  pageContents: JSX.Element;
}
function PageWrapper(options: PageOptions) {
  return <div className="p-5">{options.pageContents}</div>;
}
