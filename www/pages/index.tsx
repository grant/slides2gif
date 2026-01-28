import Head from 'next/head';
import Layout, {siteTitle} from '../components/layout';
import PageHome from '../components/home';
import {useAuth} from '../lib/useAuth';
import {Routes} from '../lib/routes';
import {useRouter} from 'next/router';
import {useEffect} from 'react';
import {LoadingScreen} from '../components/LoadingScreen';
import React from 'react';

export default function Home() {
  const router = useRouter();
  const {userData, isLoading} = useAuth();

  useEffect(() => {
    // Redirect to dashboard if user is logged in
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

  return (
    <Layout>
      <Head key="head">
        <title>{siteTitle}</title>
      </Head>
      <PageHome />
    </Layout>
  );
}
