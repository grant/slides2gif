'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {useRouter} from 'next/navigation';
import {Routes} from '../lib/routes';
import {parseGoogleSlidesPresentationId} from '../lib/utils/googleSlidesUrl';

const PasteSlidesUrlContext = createContext<(() => void) | null>(null);

export function useOpenPasteSlidesUrl(): () => void {
  const open = useContext(PasteSlidesUrlContext);
  if (!open) {
    throw new Error('useOpenPasteSlidesUrl must be used within PasteSlidesUrlProvider');
  }
  return open;
}

export function PasteSlidesUrlProvider({children}: {children: React.ReactNode}) {
  const [open, setOpen] = useState(false);
  const openDialog = useCallback(() => setOpen(true), []);

  return (
    <PasteSlidesUrlContext.Provider value={openDialog}>
      {children}
      <PasteSlidesUrlDialog open={open} onClose={() => setOpen(false)} />
    </PasteSlidesUrlContext.Provider>
  );
}

interface PasteSlidesUrlDialogProps {
  open: boolean;
  onClose: () => void;
}

function PasteSlidesUrlDialog({open, onClose}: PasteSlidesUrlDialogProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setValue('');
    setError(null);
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const presentationId = parseGoogleSlidesPresentationId(value);
    if (!presentationId) {
      setError(
        'Paste a Google Slides link (docs.google.com/presentation/d/…) or the presentation ID.'
      );
      return;
    }
    onClose();
    router.push(Routes.CREATE_PRESENTATION(presentationId));
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="paste-slides-dialog-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <h2
          id="paste-slides-dialog-title"
          className="text-lg font-semibold text-gray-900"
        >
          Create GIF from Google Slides
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Open your presentation in Google Slides, copy the link from your
          browser, and paste it below.
        </p>
        <form onSubmit={handleSubmit} className="mt-4">
          <label htmlFor="slides-url" className="sr-only">
            Google Slides URL
          </label>
          <input
            ref={inputRef}
            id="slides-url"
            type="text"
            value={value}
            onChange={e => {
              setValue(e.target.value);
              if (error) setError(null);
            }}
            placeholder="https://docs.google.com/presentation/d/…/edit"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
            autoComplete="off"
            spellCheck={false}
          />
          {error ? (
            <p className="mt-2 text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-slate-900 shadow-sm hover:bg-amber-600"
            >
              Continue
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
