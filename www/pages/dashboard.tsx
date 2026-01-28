import Head from 'next/head';
import Layout, {siteTitle} from '../components/layout';
import DashboardLayout from '../components/DashboardLayout';
import {useAuth} from '../lib/useAuth';
import {LoadingScreen} from '../components/LoadingScreen';
import {LoadingSpinner} from '../components/LoadingSpinner';
import {Routes} from '../lib/routes';
import useSWR from 'swr';
import React from 'react';

interface DashboardStats {
  gifsCreated: number;
  presentationsLoaded: number;
  totalSlidesProcessed: number;
  gifs: Array<{
    url: string;
    createdAt: number;
    presentationId?: string;
  }>;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function Dashboard() {
  const {userData: data, error: authError, isLoading: authLoading} = useAuth();
  const {
    data: stats,
    error: statsError,
    isValidating: statsLoading,
  } = useSWR<DashboardStats>('/api/dashboard', fetcher);

  if (authError) {
    return (
      <Layout>
        <Head>
          <title>Dashboard - {siteTitle}</title>
        </Head>
        <div className="p-5">Failed to load user data. Please try again.</div>
      </Layout>
    );
  }

  if (authLoading || !data) {
    return (
      <Layout>
        <Head>
          <title>Dashboard - {siteTitle}</title>
        </Head>
        <LoadingScreen fullScreen message="Loading..." />
      </Layout>
    );
  }

  if (!data.isLoggedIn) {
    return (
      <Layout>
        <Head>
          <title>Dashboard - {siteTitle}</title>
        </Head>
        <div className="p-5">Redirecting to login...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>Dashboard - {siteTitle}</title>
      </Head>
      <DashboardLayout activeTab="dashboard">
        <div className="p-8">
          <h1 className="mb-8 text-3xl font-bold text-gray-900">Dashboard</h1>

          {/* Stats */}
          {statsLoading ? (
            <div className="mb-8 flex flex-col items-center justify-center py-12">
              <LoadingSpinner size="lg" />
              <p className="mt-4 text-sm text-gray-600">Loading stats...</p>
            </div>
          ) : statsError ? (
            <div className="mb-8 text-red-600">
              Failed to load dashboard stats
            </div>
          ) : stats ? (
            <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="rounded-lg bg-white p-6 shadow-sm">
                <div className="text-sm font-medium text-gray-500">
                  GIFs Created
                </div>
                <div className="mt-2 text-3xl font-bold text-gray-900">
                  {stats.gifsCreated}
                </div>
              </div>
              <div className="rounded-lg bg-white p-6 shadow-sm">
                <div className="text-sm font-medium text-gray-500">
                  Presentations Loaded
                </div>
                <div className="mt-2 text-3xl font-bold text-gray-900">
                  {stats.presentationsLoaded}
                </div>
              </div>
              <div className="rounded-lg bg-white p-6 shadow-sm">
                <div className="text-sm font-medium text-gray-500">
                  Total Slides Processed
                </div>
                <div className="mt-2 text-3xl font-bold text-gray-900">
                  {stats.totalSlidesProcessed}
                </div>
              </div>
            </div>
          ) : null}

          {/* GIFs List */}
          {statsLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <LoadingSpinner size="lg" />
              <p className="mt-4 text-sm text-gray-600">Loading GIFs...</p>
            </div>
          ) : statsError ? (
            <div className="text-red-600">Failed to load GIFs</div>
          ) : stats && stats.gifs.length > 0 ? (
            <div>
              <h2 className="mb-4 text-2xl font-bold text-gray-900">
                Your GIFs
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {stats.gifs.map((gif, index) => (
                  <div
                    key={index}
                    className="group relative overflow-hidden rounded-lg bg-white shadow-sm transition-shadow hover:shadow-md"
                  >
                    <img
                      src={gif.url}
                      alt={`GIF ${index + 1}`}
                      className="h-48 w-full object-cover"
                    />
                    <div className="p-4">
                      <div className="text-xs text-gray-500">
                        {new Date(gif.createdAt).toLocaleDateString()}
                      </div>
                      <a
                        href={gif.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 block text-sm font-medium text-blue hover:underline"
                      >
                        View GIF →
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center">
              <p className="text-gray-600">No GIFs created yet</p>
              <a
                href={Routes.CREATE}
                className="mt-4 inline-block rounded bg-blue px-4 py-2 text-white hover:bg-blue/90"
              >
                Create your first GIF
              </a>
            </div>
          )}
        </div>
      </DashboardLayout>
    </Layout>
  );
}
