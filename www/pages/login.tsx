import Head from 'next/head';
import {GetServerSidePropsContext} from 'next';
import Layout, {siteTitle} from '../components/layout';
import PageLogin from '../components/login';
import {useRouter} from 'next/router';
import {useEffect} from 'react';
import {LoadingScreen} from '../components/LoadingScreen';
import useSWR from 'swr';
import {fetcher} from '../lib/apiFetcher';
import {APIResUser} from '../types/user';
import {Routes} from '../lib/routes';

export async function getServerSideProps(_context: GetServerSidePropsContext) {
  return {
    props: {},
  };
}

export default function Login(_props: Record<string, never>) {
  const router = useRouter();
  // Check auth status without redirecting
  const {data: userData, isValidating: isLoading} = useSWR<APIResUser>(
    '/api/user',
    fetcher
  );

  useEffect(() => {
    // Redirect to dashboard if already logged in
    if (userData?.isLoggedIn) {
      router.push(Routes.DASHBOARD);
    }
  }, [userData, router]);

  // Show loading while checking auth
  if (isLoading) {
    return (
      <Layout>
        <Head key="head">
          <title>Login - {siteTitle}</title>
        </Head>
        <LoadingScreen fullScreen message="Loading..." />
      </Layout>
    );
  }

  // Don't render login if user is already logged in (will redirect)
  if (userData?.isLoggedIn) {
    return (
      <Layout>
        <Head key="head">
          <title>Login - {siteTitle}</title>
        </Head>
        <LoadingScreen fullScreen message="Redirecting..." />
      </Layout>
    );
  }

  return (
    <Layout>
      <Head key="head">
        <title>Login - {siteTitle}</title>
      </Head>
      <PageLogin />
    </Layout>
  );
}
