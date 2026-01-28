/**
 * The page for creating GIFs. Holds functionality for multiple page types:
 * - Sign-in: Logging into the app
 * - Create: Creating a GIF from slide images
 * - Import: Importing slide images
 */
import React, {useState} from 'react';
import {APIResUser} from '../types/user';
import useSWR from 'swr';
import {useRouter} from 'next/router';
import {LoadingScreen} from './LoadingScreen';
import {LoadingSpinner} from './LoadingSpinner';
import {Routes} from '../lib/routes';
import {
  fetcher,
  presentationsSWRConfig,
  PresentationsResponse,
  Presentation,
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
  console.log('PAGE props');

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
  const {data, error} = useSWR<PresentationsResponse>(
    '/api/presentations',
    fetcher,
    presentationsSWRConfig
  );

  const handlePresentationClick = (fileId: string) => {
    router.push(Routes.CREATE_PRESENTATION(fileId));
  };

  if (!data && !error) {
    return PageWrapper({
      pageTitle: 'Create GIF',
      pageContents: <LoadingScreen message="Loading presentations..." />,
    });
  }

  if (error) {
    console.error('Error loading presentations:', error);
    const errorMessage =
      (error as any)?.info?.error ||
      (error as any)?.message ||
      'Failed to load presentations';
    return PageWrapper({
      pageTitle: 'Create GIF',
      pageContents: (
        <div className="py-10 px-5 text-center">
          <p className="text-base text-red-600">
            {errorMessage}. Please try again.
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
      ),
    });
  }

  const presentations = data?.presentations || [];

  return PageWrapper({
    pageTitle: 'Create GIF',
    pageContents: (
      <div className="py-5">
        <h3 className="mb-5 text-2xl">Choose a presentation:</h3>
        {presentations.length === 0 ? (
          <p>No presentations found.</p>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-5 py-5">
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
                      <span>No preview</span>
                    </div>
                  )}
                  <div className="truncate px-3 py-3 text-sm font-medium text-gray-800">
                    {presentation.name}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    ),
  });
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
  return (
    <div className="p-5">
      <h2>
        SLIDES2GIF <span>– {options.pageTitle}</span>
      </h2>
      {options.pageContents}
    </div>
  );
}
