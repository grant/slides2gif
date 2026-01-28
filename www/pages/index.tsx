import Head from 'next/head';
import Layout, {siteTitle} from '../components/layout';
import PageHome from '../components/home';
import {Routes} from '../lib/routes';
import {useRouter} from 'next/router';
import {useEffect} from 'react';
import {LoadingScreen} from '../components/LoadingScreen';
import React from 'react';
import useSWR from 'swr';
import {fetcher} from '../lib/apiFetcher';
import {APIResUser} from '../types/user';

export default function Home() {
  const router = useRouter();
  // Check auth status without redirecting
  const {data: userData, isValidating: isLoading} = useSWR<APIResUser>(
    '/api/user',
    fetcher
  );

  useEffect(() => {
    // Only redirect to dashboard if user is logged in
    if (userData?.isLoggedIn) {
      router.push(Routes.DASHBOARD);
    }
  }, [userData, router]);

  // Show loading while checking auth
  if (isLoading) {
    return (
      <Layout>
        <Head key="head">
          <title>{siteTitle}</title>
        </Head>
        <LoadingScreen fullScreen message="Loading..." />
      </Layout>
    );
  }

  // Don't render homepage if user is logged in (will redirect)
  if (userData?.isLoggedIn) {
    return (
      <Layout>
        <Head key="head">
          <title>{siteTitle}</title>
        </Head>
        <LoadingScreen fullScreen message="Redirecting..." />
      </Layout>
    );
  }

  // Show homepage for logged-out users
  return (
    <Layout>
      <Head key="head">
        <title>{siteTitle}</title>
      </Head>
      <PageHome />
    </Layout>
  );
}
