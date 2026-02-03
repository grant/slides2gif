/**
 * The page for creating GIFs. Holds functionality for multiple page types:
 * - Sign-in: Logging into the app
 * - Create: Creating a GIF from slide images (via Google Picker + drive.file)
 * - Import: Importing slide images
 */
import React, {useState, useEffect, useCallback} from 'react';
import {APIResUser} from '../types/user';
import {useRouter} from 'next/router';
import {LoadingSpinner} from './LoadingSpinner';
import {Routes} from '../lib/routes';

declare global {
  interface Window {
    gapi?: {
      load: (name: string, callback: () => void) => void;
    };
    google?: {
      picker: {
        PickerBuilder: new () => {
          addView: (view: unknown) => unknown;
          setOAuthToken: (token: string) => unknown;
          setAppId: (id: string) => unknown;
          setDeveloperKey: (key: string) => unknown;
          setCallback: (cb: (data: PickerResponse) => void) => unknown;
          build: () => { setVisible: (visible: boolean) => void };
        };
        ViewId: { DOCS: string; PRESENTATIONS: string };
        ViewGroup: new (id: string) => {
          addView: (viewId: string) => unknown;
        };
      };
    };
  }
}

interface PickerResponse {
  [key: string]: unknown;
  docs?: Array<{ id?: string }>;
}

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
 * Page for creating a GIF from slides.
 * Uses Google Picker (drive.file scope) so the user selects one presentation.
 */
function PageCreateGIF() {
  const router = useRouter();
  const [pickerReady, setPickerReady] = useState(false);
  const [pickerError, setPickerError] = useState<string | null>(null);
  const [openingPicker, setOpeningPicker] = useState(false);

  // Load Google Picker script
  useEffect(() => {
    if (typeof window === 'undefined' || window.gapi) {
      if (window.gapi) setPickerReady(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.async = true;
    script.onload = () => setPickerReady(true);
    script.onerror = () => setPickerError('Failed to load Google Picker');
    document.head.appendChild(script);
    return () => {
      script.remove();
    };
  }, []);

  const openPicker = useCallback(async () => {
    if (!window.gapi) {
      setPickerError('Google Picker not loaded. Refresh the page and try again.');
      return;
    }
    setOpeningPicker(true);
    setPickerError(null);
    try {
      const res = await fetch('/api/picker-token');
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `Token failed: ${res.status}`);
      }
      const {accessToken, appId, developerKey} = (await res.json()) as {
        accessToken: string;
        appId: string;
        developerKey: string;
      };
      if (!accessToken || !appId || !developerKey) {
        throw new Error('Picker not configured');
      }
      // Picker API is loaded on demand; google.picker is only set after this callback runs
      window.gapi.load('picker', () => {
        const g = (window as any).google?.picker;
        if (!g) {
          setOpeningPicker(false);
          setPickerError('Failed to load Picker. Refresh and try again.');
          return;
        }
        const picker = new g.PickerBuilder()
          .addView(g.ViewId.PRESENTATIONS)
          .setOAuthToken(accessToken)
          .setAppId(appId)
          .setDeveloperKey(developerKey)
          .setCallback((data: PickerResponse) => {
            setOpeningPicker(false);
            const action = data['action'] as string | undefined;
            const docs = (data['docs'] ?? data['documents']) as Array<{ id?: string }> | undefined;
            if (action === 'picked' && docs?.length && docs[0]?.id) {
              router.push(Routes.CREATE_PRESENTATION(docs[0].id));
            }
          })
          .build();
        picker.setVisible(true);
      });
    } catch (err) {
      setOpeningPicker(false);
      setPickerError(err instanceof Error ? err.message : 'Failed to open Picker');
    }
  }, [router]);

  return (
    <>
      <h1 className="mb-8 text-3xl font-bold text-gray-900">
        Choose a presentation
      </h1>
      <p className="mb-6 text-gray-600">
        Open a Google Slides file from your Drive. We only access files you
        choose.
      </p>
      {pickerError && (
        <div className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">
          {pickerError}
          {pickerError.includes('log in') || pickerError.includes('401') ? (
            <span className="ml-1">
              <a href="/login" className="underline">
                Log in again
              </a>
            </span>
          ) : null}
        </div>
      )}
      <button
        type="button"
        onClick={openPicker}
        disabled={!pickerReady || openingPicker}
        className="inline-flex items-center gap-2 rounded-lg bg-blue px-5 py-3 font-medium text-white shadow-sm transition hover:bg-blue/90 disabled:opacity-50"
      >
        {openingPicker ? (
          <>
            <LoadingSpinner size="sm" />
            Opening…
          </>
        ) : (
          <>
            <span className="material-icons text-xl">folder_open</span>
            Choose from Google Drive
          </>
        )}
      </button>
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
