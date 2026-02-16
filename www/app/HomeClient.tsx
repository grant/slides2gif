'use client';

import {useRouter} from 'next/navigation';
import {useEffect} from 'react';
import useSWR from 'swr';
import {fetcher} from '../lib/apiFetcher';
import {API_BASE} from '../lib/api/endpoints';
import {PATHS} from '../lib/api/definition';
import {APIResUser} from '../types/user';
import {Routes} from '../lib/routes';
import {LoadingScreen} from '../components/LoadingScreen';
import PageHome from '../components/home';

export default function HomeClient() {
  const router = useRouter();
  const {data: userData} = useSWR<APIResUser>(
    `${API_BASE}${PATHS.usersMe}`,
    fetcher
  );

  useEffect(() => {
    if (userData?.isLoggedIn) {
      router.push(Routes.DASHBOARD);
    }
  }, [userData, router]);

  // Only show loading when we know they're logged in and are redirecting.
  // Otherwise show home immediately (assume not logged in until we have a response).
  if (userData?.isLoggedIn) {
    return <LoadingScreen fullScreen message="Redirecting..." />;
  }

  return <PageHome />;
}
