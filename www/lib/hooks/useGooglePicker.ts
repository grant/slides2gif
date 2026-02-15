'use client';

import {useState, useEffect, useCallback} from 'react';
import {useRouter} from 'next/navigation';
import {Routes} from '../routes';

interface PickerResponse {
  [key: string]: unknown;
  docs?: Array<{id?: string}>;
}

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
          build: () => {setVisible: (visible: boolean) => void};
        };
        ViewId: {DOCS: string; PRESENTATIONS: string};
      };
    };
  }
}

/**
 * Hook to open Google Picker for selecting a presentation.
 * On pick, navigates to /create/x/[fileId].
 */
export function useGooglePicker() {
  const router = useRouter();
  const [pickerReady, setPickerReady] = useState(false);
  const [pickerError, setPickerError] = useState<string | null>(null);
  const [openingPicker, setOpeningPicker] = useState(false);

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
      setPickerError(
        'Google Picker not loaded. Refresh the page and try again.'
      );
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
      window.gapi.load('picker', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Google Picker API types
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
            const docs = (data['docs'] ?? data['documents']) as
              | Array<{id?: string}>
              | undefined;
            if (action === 'picked' && docs?.length && docs[0]?.id) {
              router.push(Routes.CREATE_PRESENTATION(docs[0].id));
            }
          })
          .build();
        picker.setVisible(true);
      });
    } catch (err) {
      setOpeningPicker(false);
      setPickerError(
        err instanceof Error ? err.message : 'Failed to open Picker'
      );
    }
  }, [router]);

  return {openPicker, pickerReady, pickerError, openingPicker};
}
