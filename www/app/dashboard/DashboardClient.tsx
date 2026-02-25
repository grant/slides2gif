'use client';

import {useState} from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import {useAuth} from '../../lib/useAuth';
import {LoadingScreen} from '../../components/LoadingScreen';
import {LoadingSpinner} from '../../components/LoadingSpinner';
import {useGooglePicker} from '../../lib/hooks/useGooglePicker';
import {useToast} from '../../components/ToastContext';
import useSWR from 'swr';
import {dashboardSWRConfig} from '../../lib/apiFetcher';
import {api, deleteGif, renameGif} from '../../lib/api/client';
import {PATHS} from '../../lib/api/definition';
import {API_BASE} from '../../lib/api/endpoints';
import type {DashboardStats} from '../../lib/api/schemas';
import {dashboardStatsSchema} from '../../lib/api/schemas';

const UNTITLED_LABEL = 'Untitled GIF';

type GifToDelete = {url: string; title: string};

export default function DashboardClient() {
  const {userData: data, error: authError, isLoading: authLoading} = useAuth();
  const {openPicker, pickerReady, pickerError, openingPicker} =
    useGooglePicker();
  const {toast} = useToast();
  const {
    data: stats,
    error: statsError,
    isValidating: statsLoading,
    mutate,
  } = useSWR<DashboardStats>(
    data?.isLoggedIn ? `${API_BASE}${PATHS.stats}` : null,
    () => api.get(PATHS.stats),
    dashboardSWRConfig
  );
  const [gifToDelete, setGifToDelete] = useState<GifToDelete | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [editingUrl, setEditingUrl] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [savingTitle, setSavingTitle] = useState(false);

  function displayTitle(gif: DashboardStats['gifs'][number]) {
    return gif.presentationTitle || UNTITLED_LABEL;
  }

  async function saveTitle(gifUrl: string, newTitle: string) {
    setSavingTitle(true);
    try {
      await renameGif({gifUrl, presentationTitle: newTitle});
      setEditingUrl(null);
      setEditingValue('');
      mutate(
        (prev: DashboardStats | undefined) =>
          prev
            ? {
                ...prev,
                gifs: prev.gifs.map(g =>
                  g.url === gifUrl
                    ? {...g, presentationTitle: newTitle || undefined}
                    : g
                ),
              }
            : undefined,
        {revalidate: false}
      );
      // Refetch stats so UI shows persisted metadata (and cache matches server)
      await mutate(undefined, {revalidate: true});
      toast('Title updated', 'success');
    } catch (err) {
      toast(
        err instanceof Error ? err.message : 'Failed to update title',
        'default'
      );
    } finally {
      setSavingTitle(false);
    }
  }

  function handleTitleBlur(gifUrl: string, currentValue: string) {
    if (editingUrl !== gifUrl) return;
    const trimmed = currentValue.trim();
    saveTitle(gifUrl, trimmed);
  }

  /** Force refetch with cache bypass so newly created GIFs are shown */
  async function refreshGifList() {
    setRefreshing(true);
    try {
      const res = await fetch(`${API_BASE}${PATHS.stats}`, {
        cache: 'no-store',
        credentials: 'include',
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as {error?: string};
        throw new Error(err.error || 'Failed to refresh');
      }
      const json = await res.json();
      const parsed = dashboardStatsSchema.safeParse(json);
      if (!parsed.success) {
        throw new Error('Invalid dashboard response');
      }
      mutate(parsed.data as DashboardStats, {revalidate: false});
    } catch (err) {
      toast(
        err instanceof Error ? err.message : 'Failed to refresh list',
        'default'
      );
    } finally {
      setRefreshing(false);
    }
  }

  async function confirmDelete() {
    if (!gifToDelete) return;
    const urlToRemove = gifToDelete.url;
    setDeleting(true);
    try {
      await deleteGif({gifUrl: urlToRemove});
      setGifToDelete(null);
      // Update cache immediately so the deleted GIF disappears from the UI
      mutate(
        (prev: DashboardStats | undefined) =>
          prev
            ? {
                ...prev,
                gifs: prev.gifs.filter(g => g.url !== urlToRemove),
                gifsCreated: prev.gifsCreated - 1,
              }
            : undefined,
        {revalidate: true}
      );
      toast('GIF deleted', 'success');
    } catch (err) {
      toast(
        err instanceof Error ? err.message : 'Failed to delete GIF',
        'default'
      );
    } finally {
      setDeleting(false);
    }
  }

  if (authError) {
    return (
      <div className="p-5">Failed to load user data. Please try again.</div>
    );
  }

  if (authLoading || !data) {
    return <LoadingScreen fullScreen message="Loading..." />;
  }

  if (!data.isLoggedIn) {
    return <div className="p-5">Redirecting to login...</div>;
  }

  return (
    <DashboardLayout activeTab="dashboard">
      <div className="p-8">
        <h1 className="mb-8 text-3xl font-bold text-gray-900">Dashboard</h1>

        {statsError ? (
          <div className="mb-8 text-red-600">
            Failed to load dashboard stats
          </div>
        ) : (
          <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="rounded-lg bg-white p-6 shadow-sm shadow-amber-900/5">
              <div className="text-sm font-medium text-gray-500">
                GIFs Created
              </div>
              <div className="mt-2 text-3xl font-bold text-gray-900">
                {statsLoading ? (
                  <LoadingSpinner size="sm" />
                ) : stats ? (
                  stats.gifsCreated
                ) : (
                  '–'
                )}
              </div>
            </div>
            <div className="rounded-lg bg-white p-6 shadow-sm shadow-amber-900/5">
              <div className="text-sm font-medium text-gray-500">
                Presentations Loaded
              </div>
              <div className="mt-2 text-3xl font-bold text-gray-900">
                {statsLoading ? (
                  <LoadingSpinner size="sm" />
                ) : stats ? (
                  stats.presentationsLoaded
                ) : (
                  '–'
                )}
              </div>
            </div>
            <div className="rounded-lg bg-white p-6 shadow-sm shadow-amber-900/5">
              <div className="text-sm font-medium text-gray-500">
                Total Slides Processed
              </div>
              <div className="mt-2 text-3xl font-bold text-gray-900">
                {statsLoading ? (
                  <LoadingSpinner size="sm" />
                ) : stats ? (
                  stats.totalSlidesProcessed
                ) : (
                  '–'
                )}
              </div>
            </div>
          </div>
        )}

        {statsLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-sm text-gray-600">Loading GIFs...</p>
          </div>
        ) : statsError ? (
          <div className="text-red-600">Failed to load GIFs</div>
        ) : stats && stats.gifs.length > 0 ? (
          <div>
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-2xl font-bold text-gray-900">Your GIFs</h2>
              <button
                type="button"
                onClick={refreshGifList}
                disabled={refreshing}
                className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
                title="Refresh list to show newly created GIFs"
                aria-label="Refresh GIF list"
              >
                {refreshing ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <span className="material-icons text-lg">refresh</span>
                )}
                <span>Refresh</span>
              </button>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {stats.gifs.map((gif, index) => (
                <div
                  key={index}
                  className="group relative flex flex-col overflow-hidden rounded-lg bg-white shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex aspect-video items-center justify-center bg-gray-50">
                    {/* eslint-disable-next-line @next/next/no-img-element -- dynamic GIF URL */}
                    <img
                      src={gif.url}
                      alt={displayTitle(gif)}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <div className="flex flex-1 flex-col p-3">
                    {editingUrl === gif.url ? (
                      <div className="mb-2 flex items-center gap-1">
                        <input
                          type="text"
                          value={editingValue}
                          onChange={e => setEditingValue(e.target.value)}
                          onBlur={() => handleTitleBlur(gif.url, editingValue)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleTitleBlur(gif.url, editingValue);
                            }
                            if (e.key === 'Escape') {
                              setEditingUrl(null);
                              setEditingValue('');
                            }
                          }}
                          autoFocus
                          disabled={savingTitle}
                          className="min-w-0 flex-1 rounded border border-gray-300 px-2 py-1 text-sm font-medium text-gray-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:opacity-50"
                          aria-label="Edit GIF title"
                        />
                        <button
                          type="button"
                          onClick={() => handleTitleBlur(gif.url, editingValue)}
                          disabled={savingTitle}
                          className="shrink-0 rounded p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                          aria-label="Save title"
                          title="Save title"
                        >
                          <span className="material-icons text-lg">check</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          setEditingUrl(gif.url);
                          setEditingValue(
                            gif.presentationTitle ?? UNTITLED_LABEL
                          );
                        }}
                        className="mb-2 line-clamp-2 w-full rounded text-left text-sm font-medium text-gray-900 hover:bg-gray-50 hover:underline focus:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-1"
                        title="Click to edit title"
                      >
                        {displayTitle(gif)}
                      </button>
                    )}
                    <div className="mt-auto flex items-center justify-between gap-2">
                      <div className="flex min-w-0 flex-1 items-center gap-2 text-xs text-gray-500">
                        <a
                          href={gif.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex shrink-0 items-center gap-1 rounded p-1 hover:bg-gray-100 hover:text-gray-700"
                          aria-label="Open GIF in new tab"
                          onClick={e => e.stopPropagation()}
                          title="Open GIF"
                        >
                          <span className="material-icons text-base">
                            image
                          </span>
                          <span>GIF</span>
                        </a>
                        {gif.presentationId ? (
                          <a
                            href={`https://docs.google.com/presentation/d/${gif.presentationId}/edit`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex shrink-0 items-center gap-1 rounded p-1 hover:bg-gray-100 hover:text-gray-700"
                            aria-label="Open presentation in Google Slides"
                            onClick={e => e.stopPropagation()}
                            title="Open presentation"
                          >
                            <span className="material-icons text-base">
                              slideshow
                            </span>
                            <span>Slides</span>
                          </a>
                        ) : null}
                        <span className="shrink-0">
                          {new Date(gif.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          setGifToDelete({
                            url: gif.url,
                            title: displayTitle(gif),
                          });
                        }}
                        className="shrink-0 rounded p-1 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                        aria-label="Delete GIF"
                        title="Delete GIF"
                      >
                        <span className="material-icons text-lg">delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-lg border-2 border-dashed border-amber-200 bg-amber-50/50 p-12 text-center">
            <p className="text-gray-600">No GIFs created yet</p>
            {pickerError && (
              <p className="mt-2 text-sm text-red-600">{pickerError}</p>
            )}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={openPicker}
                disabled={!pickerReady || openingPicker}
                className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 font-medium text-slate-900 shadow-sm shadow-amber-900/20 hover:bg-amber-600 disabled:opacity-50"
              >
                {openingPicker ? (
                  <>
                    <LoadingSpinner size="sm" />
                    Opening…
                  </>
                ) : (
                  'Create your first GIF'
                )}
              </button>
              <button
                type="button"
                onClick={refreshGifList}
                disabled={refreshing}
                className="inline-flex items-center gap-2 rounded border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                title="Refresh list to show newly created GIFs"
              >
                {refreshing ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <span className="material-icons text-lg">refresh</span>
                )}
                Refresh
              </button>
            </div>
          </div>
        )}

        {gifToDelete ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
          >
            <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
              <h2
                id="delete-dialog-title"
                className="text-lg font-semibold text-gray-900"
              >
                Delete GIF?
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                Are you sure you want to delete this GIF? This cannot be undone.
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setGifToDelete(null)}
                  disabled={deleting}
                  className="rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  disabled={deleting}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {deleting ? <LoadingSpinner size="sm" /> : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
