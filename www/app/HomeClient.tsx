'use client';

import {useRouter} from 'next/navigation';
import {useEffect} from 'react';
import useSWR from 'swr';
import {fetcher} from '../lib/apiFetcher';
import {APIResUser} from '../types/user';
import {Routes} from '../lib/routes';
import {LoadingScreen} from '../components/LoadingScreen';
import PageHome from '../components/home';

export default function HomeClient() {
  const router = useRouter();
  const {data: userData, isValidating: isLoading} = useSWR<APIResUser>(
    '/api/user',
    fetcher
  );

  useEffect(() => {
    if (userData?.isLoggedIn) {
      router.push(Routes.DASHBOARD);
    }
  }, [userData, router]);

  if (isLoading) {
    return <LoadingScreen fullScreen message="Loading..." />;
  }

  if (userData?.isLoggedIn) {
    return <LoadingScreen fullScreen message="Redirecting..." />;
  }

  return <PageHome />;
}
